/**
 * Gen-2 Sim Trader — Dual strategy with pm2 keep-alive
 *
 * Fixes from Gen-0/Gen-1:
 * - Gen-0: Position math fixed (shared lib.mjs), 5% size not 20%
 * - Gen-1: Dual strategy (trend + mean reversion), adaptive entry
 * - pm2 keep-alive (no more silent crashes)
 * - DEATH → process.exit(1)
 */
import { fetchHourly, getSignals, CONFIG, closePosition, openPosition, calcPnlPct } from './lib.mjs';
import { readFileSync, writeFileSync, existsSync, appendFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOGS_DIR = join(__dirname, '..', 'logs');
mkdirSync(LOGS_DIR, { recursive: true });
const STATE_FILE = join(LOGS_DIR, 'sim-state.json');
const TRADE_LOG = join(LOGS_DIR, 'trades.jsonl');
const RISK_FILE = join(LOGS_DIR, 'risk-state.json');

// ─── State ───
function loadState() {
  if (existsSync(STATE_FILE)) return JSON.parse(readFileSync(STATE_FILE, 'utf8'));
  return {
    cash: CONFIG.INITIAL_CAPITAL,
    positions: [],    // array: one per strategy
    totalTrades: 0,
    lastCheck: null,
    lastSignalTime: null,
    startTime: new Date().toISOString(),
  };
}
function saveState(s) { writeFileSync(STATE_FILE, JSON.stringify(s, null, 2)); }

function loadRisk() {
  if (existsSync(RISK_FILE)) return JSON.parse(readFileSync(RISK_FILE, 'utf8'));
  return {
    dailyStartCapital: CONFIG.INITIAL_CAPITAL,
    dailyDate: new Date().toISOString().slice(0, 10),
    consecutiveLosses: 0,
    pausedUntil: null,
  };
}
function saveRisk(r) { writeFileSync(RISK_FILE, JSON.stringify(r, null, 2)); }

function logTrade(t) {
  appendFileSync(TRADE_LOG, JSON.stringify({ ...t, timestamp: new Date().toISOString() }) + '\n');
}

function portfolioValue(state, price) {
  let total = state.cash;
  for (const pos of state.positions) {
    const { proceeds } = closePosition(pos, price);
    total += proceeds;
  }
  return total;
}

// ─── Risk checks ───
function checkRisk(state, risk, price) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  if (risk.dailyDate !== today) {
    risk.dailyStartCapital = portfolioValue(state, price);
    risk.dailyDate = today;
    risk.consecutiveLosses = 0;
    risk.pausedUntil = null;
  }

  if (risk.pausedUntil && now < new Date(risk.pausedUntil)) {
    console.log(`  ⏸️ PAUSED until ${risk.pausedUntil} (${risk.consecutiveLosses} consecutive losses)`);
    return false;
  }
  risk.pausedUntil = null;

  const currentValue = portfolioValue(state, price);
  const dailyLossPct = (1 - currentValue / risk.dailyStartCapital) * 100;
  if (dailyLossPct >= CONFIG.DAILY_LOSS_LIMIT) {
    console.log(`  🚫 DAILY LOSS LIMIT: -${dailyLossPct.toFixed(2)}%. Paused for day.`);
    risk.pausedUntil = today + 'T23:59:59Z';
    return false;
  }

  return true;
}

// ─── Main run ───
async function run() {
  const state = loadState();
  const risk = loadRisk();
  const data = await fetchHourly(168);
  const price = data[data.length - 1].close;
  const totalValue = portfolioValue(state, price);

  const posInfo = state.positions.length > 0
    ? state.positions.map(p => `${p.strategy}:${p.side}@$${p.entry.toFixed(0)}`).join(', ')
    : 'NONE';

  console.log(`[${new Date().toISOString()}] BTC=$${price.toFixed(0)} | Portfolio=$${totalValue.toFixed(2)} | Cash=$${state.cash.toFixed(2)} | Pos=[${posInfo}] | Trades=${state.totalTrades}`);

  // ☠️ DEATH CHECK
  if (totalValue < CONFIG.INITIAL_CAPITAL * 0.5) {
    console.log('  ☠️ DEATH: Portfolio below 50%. HARD EXIT.');
    logTrade({ action: 'DEATH', portfolio: totalValue.toFixed(2) });
    saveState(state);
    process.exit(1);
  }

  const canTrade = checkRisk(state, risk, price);

  // Manage existing positions
  for (let p = state.positions.length - 1; p >= 0; p--) {
    const pos = state.positions[p];
    const pnlPct = calcPnlPct(pos.side, pos.entry, price);
    let shouldClose = false, reason = '';

    if (pnlPct <= CONFIG.STOP_LOSS) { reason = 'SL'; shouldClose = true; }
    else if (pnlPct >= CONFIG.TAKE_PROFIT) { reason = 'TP'; shouldClose = true; }

    if (shouldClose) {
      const { proceeds, pnlPct: finalPnl } = closePosition(pos, price);
      state.cash += proceeds;
      state.positions.splice(p, 1);
      state.totalTrades++;

      const won = finalPnl > 0;
      risk.consecutiveLosses = won ? 0 : risk.consecutiveLosses + 1;

      console.log(`  ${won ? '✅' : '⛔'} CLOSE [${pos.strategy}] (${reason}): PnL ${finalPnl.toFixed(2)}% | Cash=$${state.cash.toFixed(2)}`);
      logTrade({ action: `CLOSE_${reason}`, strategy: pos.strategy, side: pos.side, pnl: finalPnl.toFixed(2) + '%', cash: state.cash.toFixed(2) });

      if (risk.consecutiveLosses >= CONFIG.CONSEC_LOSS_PAUSE) {
        const pauseUntil = new Date(Date.now() + CONFIG.PAUSE_MINUTES * 60000).toISOString();
        risk.pausedUntil = pauseUntil;
        console.log(`  ⏸️ ${risk.consecutiveLosses} consecutive losses → paused until ${pauseUntil}`);
      }
    } else {
      console.log(`  📊 Holding [${pos.strategy}] ${pos.side}: PnL ${pnlPct.toFixed(2)}%`);
    }
  }

  // Open new positions
  if (canTrade) {
    const signals = getSignals(data, state.lastSignalTime ? new Date(state.lastSignalTime).getTime() : null, new Date(state.startTime).getTime());
    const activeStrategies = new Set(state.positions.map(p => p.strategy));

    for (const { strategy, signal, adaptive } of signals) {
      if (activeStrategies.has(strategy)) continue;

      // Check max position limit
      const currentExposure = state.positions.reduce((sum, p) => sum + p.collateral, 0);
      if (currentExposure + state.cash * CONFIG.POSITION_SIZE > state.cash + currentExposure) continue; // sanity

      const side = signal === 'BUY' ? 'LONG' : 'SHORT';
      const { position, cost } = openPosition(side, price, state.cash);
      position.strategy = strategy;
      state.positions.push(position);
      state.cash -= cost;
      state.lastSignalTime = new Date().toISOString();

      const adaptLabel = adaptive ? ' (adaptive)' : '';
      console.log(`  ${side === 'LONG' ? '🟢' : '🔴'} OPEN [${strategy}] ${side}${adaptLabel}: ${position.qty.toFixed(6)} BTC @ $${price.toFixed(0)} (size: $${cost.toFixed(2)})`);
      logTrade({ action: 'OPEN', strategy, side, price: price.toFixed(2), qty: position.qty.toFixed(6), size: cost.toFixed(2), adaptive });
    }
  }

  // Final portfolio
  const finalValue = portfolioValue(state, price);
  const retPct = ((finalValue / CONFIG.INITIAL_CAPITAL - 1) * 100).toFixed(2);
  console.log(`  💰 Portfolio: $${finalValue.toFixed(2)} (${retPct}%)`);

  state.lastCheck = new Date().toISOString();
  saveState(state);
  saveRisk(risk);
}

// ─── Entry ───
const loopMode = process.argv.includes('--loop');
const INTERVAL_MS = 30 * 60 * 1000;

async function main() {
  await run();
  if (loopMode) {
    console.log(`  ⏰ Next check in 30 minutes...`);
    setInterval(() => run().catch(e => { console.error(e); process.exit(1); }), INTERVAL_MS);
  }
}
main().catch(e => { console.error(e); process.exit(1); });
