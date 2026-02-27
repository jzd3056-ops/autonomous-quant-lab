/**
 * Gen-1 Sim Trader
 *
 * FIXES from Gen-0:
 * 1. Capital tracking: cash + position tracked separately (like backtest)
 * 2. Position size: 5% (not 20%)
 * 3. Risk controls: daily loss >5% pauses, 3 consecutive losses pauses 15min
 * 4. DEATH signal → process.exit(1)
 * 5. Same hourly timeframe as backtest
 * 6. Shared lib.mjs for identical signal/sizing logic
 */
import { fetchHourly, getPrice, getSignal, CONFIG, closePosition, openPosition, calcPnlPct } from './lib.mjs';
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
    position: null,
    totalTrades: 0,
    lastCheck: null,
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

// ─── Risk checks ───
function checkRisk(state, risk) {
  const now = new Date();

  // Reset daily tracking on new day
  const today = now.toISOString().slice(0, 10);
  if (risk.dailyDate !== today) {
    risk.dailyStartCapital = portfolioValue(state);
    risk.dailyDate = today;
    risk.consecutiveLosses = 0;
    risk.pausedUntil = null;
  }

  // Check pause
  if (risk.pausedUntil && now < new Date(risk.pausedUntil)) {
    console.log(`  ⏸️ PAUSED until ${risk.pausedUntil} (${risk.consecutiveLosses} consecutive losses)`);
    return false;
  }
  risk.pausedUntil = null;

  // Daily loss check
  const currentValue = portfolioValue(state);
  const dailyLossPct = (1 - currentValue / risk.dailyStartCapital) * 100;
  if (dailyLossPct >= CONFIG.DAILY_LOSS_LIMIT) {
    console.log(`  🚫 DAILY LOSS LIMIT: -${dailyLossPct.toFixed(2)}% today. Trading paused for rest of day.`);
    risk.pausedUntil = today + 'T23:59:59Z';
    return false;
  }

  return true; // OK to trade
}

function portfolioValue(state) {
  // We need current price to value position, but for risk checks we use last known
  return state.cash + (state.position ? state.position.collateral : 0);
}

// ─── Main run ───
async function run() {
  const state = loadState();
  const risk = loadRisk();
  const data = await fetchHourly(168); // same as backtest: 7 days hourly
  const price = data[data.length - 1].close;
  const signal = getSignal(data);

  // Accurate portfolio value
  let totalValue = state.cash;
  if (state.position) {
    const { proceeds } = closePosition(state.position, price);
    totalValue = state.cash + proceeds;
    // But don't actually close — just computing value
  } else {
    totalValue = state.cash;
  }

  console.log(`[${new Date().toISOString()}] BTC=$${price.toFixed(0)} | Signal=${signal} | Cash=$${state.cash.toFixed(2)} | Portfolio=$${totalValue.toFixed(2)} | Position=${state.position ? `${state.position.side} @ $${state.position.entry.toFixed(0)}` : 'NONE'}`);

  // ☠️ DEATH CHECK — hard exit
  if (totalValue < CONFIG.INITIAL_CAPITAL * 0.5) {
    console.log('  ☠️ DEATH: Portfolio below 50%. HARD EXIT.');
    logTrade({ action: 'DEATH', portfolio: totalValue.toFixed(2) });
    saveState(state);
    process.exit(1);  // Gen-0 bug fix: actually exit
  }

  // Risk gate
  const canTrade = checkRisk(state, risk);

  // Position management
  if (state.position) {
    const pnlPct = calcPnlPct(state.position.side, state.position.entry, price);
    let shouldClose = false, reason = '';

    if (pnlPct <= CONFIG.STOP_LOSS) { reason = 'SL'; shouldClose = true; }
    else if (pnlPct >= CONFIG.TAKE_PROFIT) { reason = 'TP'; shouldClose = true; }

    // Reversal
    if (!shouldClose && state.position.side === 'LONG' && (signal === 'SHORT' || signal === 'SELL_OVERBOUGHT')) { reason = 'REV'; shouldClose = true; }
    if (!shouldClose && state.position.side === 'SHORT' && (signal === 'BUY' || signal === 'BUY_OVERSOLD')) { reason = 'REV'; shouldClose = true; }

    if (shouldClose) {
      const { proceeds, pnlPct: finalPnl } = closePosition(state.position, price);
      state.cash += proceeds;
      state.position = null;
      state.totalTrades++;

      const won = finalPnl > 0;
      risk.consecutiveLosses = won ? 0 : risk.consecutiveLosses + 1;

      console.log(`  ${won ? '✅' : '⛔'} CLOSE (${reason}): PnL ${finalPnl.toFixed(2)}% | Cash=$${state.cash.toFixed(2)}`);
      logTrade({ action: `CLOSE_${reason}`, side: state.position?.side, pnl: finalPnl.toFixed(2) + '%', cash: state.cash.toFixed(2) });

      // Consecutive loss pause
      if (risk.consecutiveLosses >= CONFIG.CONSEC_LOSS_PAUSE) {
        const pauseUntil = new Date(Date.now() + CONFIG.PAUSE_MINUTES * 60000).toISOString();
        risk.pausedUntil = pauseUntil;
        console.log(`  ⏸️ ${risk.consecutiveLosses} consecutive losses → paused until ${pauseUntil}`);
      }
    } else {
      console.log(`  📊 Holding ${state.position.side}: PnL ${pnlPct.toFixed(2)}%`);
    }
  }

  // Open new position (only if risk allows)
  if (!state.position && canTrade) {
    if (signal === 'BUY' || signal === 'BUY_OVERSOLD') {
      const { position, cost } = openPosition('LONG', price, state.cash);
      state.position = position;
      state.cash -= cost;
      console.log(`  🟢 OPEN LONG: ${position.qty.toFixed(6)} BTC @ $${price.toFixed(0)} (size: $${cost.toFixed(2)})`);
      logTrade({ action: 'OPEN', side: 'LONG', price: price.toFixed(2), qty: position.qty.toFixed(6), size: cost.toFixed(2) });
    } else if (signal === 'SHORT' || signal === 'SELL_OVERBOUGHT') {
      const { position, cost } = openPosition('SHORT', price, state.cash);
      state.position = position;
      state.cash -= cost;
      console.log(`  🔴 OPEN SHORT: ${position.qty.toFixed(6)} BTC @ $${price.toFixed(0)} (size: $${cost.toFixed(2)})`);
      logTrade({ action: 'OPEN', side: 'SHORT', price: price.toFixed(2), qty: position.qty.toFixed(6), size: cost.toFixed(2) });
    }
  }

  // Recalculate final portfolio
  totalValue = state.cash;
  if (state.position) {
    const { proceeds } = closePosition(state.position, price);
    totalValue = state.cash + proceeds;
  }
  console.log(`  💰 Portfolio: $${totalValue.toFixed(2)} (${((totalValue / CONFIG.INITIAL_CAPITAL - 1) * 100).toFixed(2)}%)`);

  state.lastCheck = new Date().toISOString();
  saveState(state);
  saveRisk(risk);
}

// ─── Entry ───
const loopMode = process.argv.includes('--loop');
const INTERVAL_MS = 30 * 60 * 1000; // 30 minutes (matches cron interval)

async function main() {
  await run();
  if (loopMode) {
    console.log(`  ⏰ Next check in 30 minutes...`);
    setInterval(() => run().catch(e => { console.error(e); process.exit(1); }), INTERVAL_MS);
  }
}
main().catch(e => { console.error(e); process.exit(1); });
