import fetch from 'node-fetch';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const STATE_FILE = '../logs/sim-state.json';
const TRADE_LOG = '../logs/trades.jsonl';

// --- State ---
function loadState() {
  if (existsSync(STATE_FILE)) return JSON.parse(readFileSync(STATE_FILE, 'utf8'));
  return { capital: 10000, position: null, trades: [], lastCheck: null, totalTrades: 0 };
}
function saveState(s) { writeFileSync(STATE_FILE, JSON.stringify(s, null, 2)); }
function logTrade(t) {
  const line = JSON.stringify({ ...t, timestamp: new Date().toISOString() });
  writeFileSync(TRADE_LOG, (existsSync(TRADE_LOG) ? readFileSync(TRADE_LOG,'utf8') : '') + line + '\n');
}

// --- Recent data + current price (single API call) ---
async function getRecentData(days = 7) {
  // Try CoinGecko first, fallback to CryptoCompare
  try {
    const r = await fetch(`https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${days}`);
    const d = await r.json();
    if (d.prices) return d.prices.map(([t, p]) => ({ time: t, close: p }));
  } catch(e) {}
  // Fallback: CryptoCompare
  const r = await fetch(`https://min-api.cryptocompare.com/data/v2/histohour?fsym=BTC&tsym=USD&limit=${days*24}`);
  const d = await r.json();
  return d.Data.Data.map(c => ({ time: c.time*1000, close: c.close }));
}
async function getPrice() {
  const data = await getRecentData(1);
  return data[data.length-1].close;
}

// --- Indicators ---
function ema(prices, period) {
  const k = 2/(period+1); const r = [prices[0]];
  for (let i=1;i<prices.length;i++) r.push(prices[i]*k+r[i-1]*(1-k));
  return r;
}
function rsi(prices, period=14) {
  const r = new Array(prices.length).fill(null);
  let g=0,l=0;
  for(let i=1;i<=period;i++){const d=prices[i]-prices[i-1];if(d>0)g+=d;else l-=d;}
  let ag=g/period,al=l/period;
  r[period]=al===0?100:100-100/(1+ag/al);
  for(let i=period+1;i<prices.length;i++){
    const d=prices[i]-prices[i-1];
    ag=(ag*(period-1)+(d>0?d:0))/period;
    al=(al*(period-1)+(d<0?-d:0))/period;
    r[i]=al===0?100:100-100/(1+ag/al);
  }
  return r;
}

// --- Signal generation (aggressive v2) ---
function getSignal(data) {
  const closes = data.map(d => d.close);
  // Ultra_2_5 strategy — matches winning backtest
  const f = ema(closes, 2), s = ema(closes, 5);
  const r = rsi(closes, 4);
  const i = data.length - 1;
  const ip = i - 1;
  
  if (r[i] === null) return 'HOLD';
  
  const emaBullCross = f[ip] <= s[ip] && f[i] > s[i];
  const emaBearCross = f[ip] >= s[ip] && f[i] < s[i];
  const trend = f[i] > s[i] ? 'UP' : 'DOWN';
  
  // --- Ultra-aggressive signals (more triggers) ---
  // EMA crossover
  if (emaBullCross) return 'BUY';
  if (emaBearCross) return 'SHORT';
  
  // RSI extremes — widened bands for more signals
  if (r[i] > 60) return 'SELL_OVERBOUGHT';
  if (r[i] < 40) return 'BUY_OVERSOLD';
  
  // Trend continuation with any momentum — lowered threshold
  const momentum = (closes[i] - closes[Math.max(0, i-3)]) / closes[Math.max(0, i-3)] * 100;
  if (trend === 'UP' && momentum > 0.05) return 'BUY';
  if (trend === 'DOWN' && momentum < -0.05) return 'SHORT';
  
  // EMA spread signal — nearly always triggers when not flat
  const spread = (f[i] - s[i]) / s[i] * 100;
  if (spread > 0.01) return 'BUY';
  if (spread < -0.01) return 'SHORT';
  
  return 'HOLD';
}

// --- Execute ---
async function run() {
  const state = loadState();
  const price = await getPrice();
  const data = await getRecentData(7);
  const signal = getSignal(data);
  
  console.log(`[${new Date().toISOString()}] BTC=$${price} | Signal=${signal} | Capital=$${state.capital.toFixed(2)} | Position=${state.position ? `${state.position.side} @ $${state.position.entry}` : 'NONE'}`);
  
  // Position management: check stop-loss / take-profit
  if (state.position) {
    const { side, entry, qty } = state.position;
    const pnlPct = side === 'LONG' ? (price - entry)/entry*100 : (entry - price)/entry*100;
    
    if (pnlPct <= -0.8) { // stop loss — tightened for more trades
      const pnl = side === 'LONG' ? qty*(price-entry) : qty*(entry-price);
      state.capital += qty*price + (side==='SHORT'? qty*(entry-price) : 0);
      if (side==='LONG') state.capital = qty*price;
      else state.capital = state.position.collateral + qty*(entry-price);
      console.log(`  ⛔ STOP LOSS: ${side} closed at $${price}, PnL: ${pnlPct.toFixed(2)}%`);
      logTrade({ action:'CLOSE_SL', side, entry, exit:price, pnl:pnlPct.toFixed(2)+'%', capital:state.capital.toFixed(2) });
      state.position = null; state.totalTrades++;
    } else if (pnlPct >= 1.0) { // take profit — tightened for more trades
      if (side==='LONG') state.capital = qty*price;
      else state.capital = state.position.collateral + qty*(entry-price);
      console.log(`  ✅ TAKE PROFIT: ${side} closed at $${price}, PnL: ${pnlPct.toFixed(2)}%`);
      logTrade({ action:'CLOSE_TP', side, entry, exit:price, pnl:pnlPct.toFixed(2)+'%', capital:state.capital.toFixed(2) });
      state.position = null; state.totalTrades++;
    } else {
      console.log(`  📊 Holding ${side}: PnL ${pnlPct.toFixed(2)}%`);
    }
  }
  
  // New position
  if (!state.position) {
    const posSize = state.capital * 0.2; // 20% — matches winning backtest
    if (signal === 'BUY' || signal === 'BUY_OVERSOLD') {
      const qty = posSize / price;
      state.position = { side:'LONG', entry:price, qty, collateral:posSize, openTime:new Date().toISOString() };
      state.capital -= posSize;
      // Actually for long: capital becomes the remaining cash; position value = qty * current price
      state.capital = state.capital; // remaining 50%
      console.log(`  🟢 OPEN LONG: ${qty.toFixed(6)} BTC @ $${price} (size: $${posSize.toFixed(2)})`);
      logTrade({ action:'OPEN', side:'LONG', price, qty:qty.toFixed(6), size:posSize.toFixed(2) });
    } else if (signal === 'SHORT' || signal === 'SELL_OVERBOUGHT') {
      const qty = posSize / price;
      state.position = { side:'SHORT', entry:price, qty, collateral:posSize, openTime:new Date().toISOString() };
      state.capital -= posSize;
      console.log(`  🔴 OPEN SHORT: ${qty.toFixed(6)} BTC @ $${price} (size: $${posSize.toFixed(2)})`);
      logTrade({ action:'OPEN', side:'SHORT', price, qty:qty.toFixed(6), size:posSize.toFixed(2) });
    }
  }
  
  // Close opposite signals
  if (state.position) {
    if (state.position.side === 'LONG' && (signal === 'SHORT' || signal === 'SELL_OVERBOUGHT')) {
      const { entry, qty, collateral } = state.position;
      state.capital += qty * price;
      const pnlPct = ((price-entry)/entry*100).toFixed(2);
      console.log(`  🔄 CLOSE LONG (reversal): PnL ${pnlPct}%`);
      logTrade({ action:'CLOSE_REV', side:'LONG', entry, exit:price, pnl:pnlPct+'%', capital:state.capital.toFixed(2) });
      state.position = null; state.totalTrades++;
    } else if (state.position.side === 'SHORT' && (signal === 'BUY' || signal === 'BUY_OVERSOLD')) {
      const { entry, qty, collateral } = state.position;
      state.capital = collateral + qty*(entry-price);
      state.capital += state.capital; // add back remaining
      const pnlPct = ((entry-price)/entry*100).toFixed(2);
      console.log(`  🔄 CLOSE SHORT (reversal): PnL ${pnlPct}%`);
      logTrade({ action:'CLOSE_REV', side:'SHORT', entry, exit:price, pnl:pnlPct+'%', capital:state.capital.toFixed(2) });
      state.position = null; state.totalTrades++;
    }
  }
  
  state.lastCheck = new Date().toISOString();
  
  // Calculate total portfolio value
  let totalValue = state.capital;
  if (state.position) {
    if (state.position.side === 'LONG') totalValue += state.position.qty * price;
    else totalValue += state.position.collateral + state.position.qty * (state.position.entry - price);
  }
  console.log(`  💰 Portfolio: $${totalValue.toFixed(2)} (${((totalValue/10000-1)*100).toFixed(2)}%)`);
  
  // Death check
  if (totalValue < 5000) {
    console.log('  ☠️ DEATH: Portfolio below 50% of initial capital!');
    logTrade({ action:'DEATH', capital: totalValue.toFixed(2) });
  }
  
  saveState(state);
}

// Support --loop flag for continuous running
const loopMode = process.argv.includes('--loop');
const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes — ultra-aggressive for trade count

async function main() {
  await run();
  if (loopMode) {
    console.log(`  ⏰ Next check in 30 minutes...`);
    setInterval(() => run().catch(console.error), INTERVAL_MS);
  }
}
main().catch(console.error);
