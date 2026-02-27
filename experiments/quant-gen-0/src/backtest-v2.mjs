/**
 * Backtest v2 — Ultra-aggressive params: SL -0.8%, TP +1.0%, RSI 40/60
 * Uses CryptoCompare hourly data
 */
import fetch from 'node-fetch';

async function fetchHourly() {
  const r = await fetch('https://min-api.cryptocompare.com/data/v2/histohour?fsym=BTC&tsym=USD&limit=168');
  const d = await r.json();
  return d.Data.Data.map(c => ({ time: c.time * 1000, close: c.close }));
}

function ema(prices, period) {
  const k = 2 / (period + 1), r = [prices[0]];
  for (let i = 1; i < prices.length; i++) r.push(prices[i] * k + r[i - 1] * (1 - k));
  return r;
}

function rsi(prices, period) {
  const r = new Array(prices.length).fill(null);
  let g = 0, l = 0;
  for (let i = 1; i <= period && i < prices.length; i++) {
    const d = prices[i] - prices[i - 1]; d > 0 ? g += d : l -= d;
  }
  if (period >= prices.length) return r;
  let ag = g / period, al = l / period;
  r[period] = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
  for (let i = period + 1; i < prices.length; i++) {
    const d = prices[i] - prices[i - 1];
    ag = (ag * (period - 1) + (d > 0 ? d : 0)) / period;
    al = (al * (period - 1) + (d < 0 ? -d : 0)) / period;
    r[i] = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
  }
  return r;
}

function getSignal(closes, f, s, r, i) {
  if (r[i] === null) return 'HOLD';
  const ip = i - 1;
  if (f[ip] <= s[ip] && f[i] > s[i]) return 'BUY';
  if (f[ip] >= s[ip] && f[i] < s[i]) return 'SHORT';
  if (r[i] > 60) return 'SELL_OVERBOUGHT';
  if (r[i] < 40) return 'BUY_OVERSOLD';
  const momentum = (closes[i] - closes[Math.max(0, i - 3)]) / closes[Math.max(0, i - 3)] * 100;
  const trend = f[i] > s[i] ? 'UP' : 'DOWN';
  if (trend === 'UP' && momentum > 0.05) return 'BUY';
  if (trend === 'DOWN' && momentum < -0.05) return 'SHORT';
  const spread = (f[i] - s[i]) / s[i] * 100;
  if (spread > 0.01) return 'BUY';
  if (spread < -0.01) return 'SHORT';
  return 'HOLD';
}

async function main() {
  const data = await fetchHourly();
  const closes = data.map(d => d.close);
  const f = ema(closes, 2), s = ema(closes, 5), r = rsi(closes, 4);
  
  let capital = 10000, pos = null, trades = 0, wins = 0;
  const SL = -0.8, TP = 1.0, SIZE = 0.2;
  
  for (let i = 5; i < data.length; i++) {
    const price = closes[i];
    
    // Check SL/TP
    if (pos) {
      const pnl = pos.side === 'LONG' ? (price - pos.entry) / pos.entry * 100 : (pos.entry - price) / pos.entry * 100;
      let closed = false, reason = '';
      if (pnl <= SL) { reason = 'SL'; closed = true; }
      else if (pnl >= TP) { reason = 'TP'; closed = true; }
      
      // Check reversal signal
      const sig = getSignal(closes, f, s, r, i);
      if (!closed && pos.side === 'LONG' && (sig === 'SHORT' || sig === 'SELL_OVERBOUGHT')) { reason = 'REV'; closed = true; }
      if (!closed && pos.side === 'SHORT' && (sig === 'BUY' || sig === 'BUY_OVERSOLD')) { reason = 'REV'; closed = true; }
      
      if (closed) {
        if (pos.side === 'LONG') capital = pos.cash + pos.qty * price;
        else capital = pos.cash + pos.collateral + pos.qty * (pos.entry - price);
        trades++;
        if (pnl > 0) wins++;
        pos = null;
      }
    }
    
    // Open
    if (!pos) {
      const sig = getSignal(closes, f, s, r, i);
      const posSize = capital * SIZE;
      if (sig === 'BUY' || sig === 'BUY_OVERSOLD') {
        pos = { side: 'LONG', entry: price, qty: posSize / price, cash: capital - posSize, collateral: posSize };
      } else if (sig === 'SHORT' || sig === 'SELL_OVERBOUGHT') {
        pos = { side: 'SHORT', entry: price, qty: posSize / price, cash: capital - posSize, collateral: posSize };
      }
    }
  }
  
  // Close final
  if (pos) {
    const price = closes[closes.length - 1];
    if (pos.side === 'LONG') capital = pos.cash + pos.qty * price;
    else capital = pos.cash + pos.collateral + pos.qty * (pos.entry - price);
    trades++;
  }
  
  const ret = ((capital / 10000 - 1) * 100).toFixed(2);
  const wr = trades > 0 ? ((wins / trades) * 100).toFixed(1) : '0';
  console.log(`\n=== Backtest V2 (Ultra-Aggressive) ===`);
  console.log(`Trades: ${trades} | Win Rate: ${wr}% | Return: ${ret}% | Final: $${capital.toFixed(2)}`);
  console.log(`Params: EMA(2/5) RSI(4) SL=${SL}% TP=${TP}% Size=${SIZE*100}%`);
  console.log(`RSI bands: 40/60, Momentum threshold: 0.05%, Spread threshold: 0.01%`);
}

main().catch(console.error);
