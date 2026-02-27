/**
 * Gen-2 Shared Library
 * 
 * Improvements over Gen-1:
 * - Dual strategy: Trend Following (EMA crossover) + Mean Reversion (RSI extremes)
 * - Adaptive entry: loosens thresholds after 2h of no signals
 * - Position size: 5% base, max 10% per strategy
 * - Risk: daily loss >5% pause, 3 consecutive losses → 15min pause
 * - DEATH at 50% drawdown → process.exit(1)
 */
import fetch from 'node-fetch';

// ─── Config ───
export const CONFIG = {
  POSITION_SIZE: 0.05,    // 5% of capital per trade
  MAX_POSITION: 0.10,     // max 10% in one strategy
  STOP_LOSS: -2.0,        // % (slightly wider than Gen-1's -1.5 to avoid whipsaws)
  TAKE_PROFIT: 3.0,       // % (wider TP for better R:R)
  DAILY_LOSS_LIMIT: 5,    // %
  CONSEC_LOSS_PAUSE: 3,
  PAUSE_MINUTES: 15,
  INITIAL_CAPITAL: 10000,
  // Adaptive entry
  ADAPT_HOURS: 2,         // hours without signal before loosening
  ADAPT_FACTOR: 0.8,      // multiply thresholds by this (20% looser)
};

// ─── Data ───
export async function fetchHourly(hours = 168) {
  try {
    const r = await fetch(`https://min-api.cryptocompare.com/data/v2/histohour?fsym=BTC&tsym=USD&limit=${hours}`);
    const d = await r.json();
    if (d.Data?.Data) return d.Data.Data.map(c => ({ time: c.time * 1000, close: c.close }));
  } catch {}
  const r = await fetch(`https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${Math.ceil(hours / 24)}`);
  const d = await r.json();
  return d.prices.map(([t, p]) => ({ time: t, close: p }));
}

export async function getPrice() {
  const data = await fetchHourly(2);
  return data[data.length - 1].close;
}

// ─── Indicators ───
export function ema(prices, period) {
  const k = 2 / (period + 1), r = [prices[0]];
  for (let i = 1; i < prices.length; i++) r.push(prices[i] * k + r[i - 1] * (1 - k));
  return r;
}

export function rsi(prices, period = 14) {
  const r = new Array(prices.length).fill(null);
  let g = 0, l = 0;
  for (let i = 1; i <= period && i < prices.length; i++) {
    const d = prices[i] - prices[i - 1];
    d > 0 ? g += d : l -= d;
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

// ─── Dual Strategy Signals ───

/**
 * Strategy 1: Trend Following — EMA(5/13) crossover + RSI filter
 * Returns: BUY | SHORT | HOLD
 */
export function trendSignal(data, adaptive = false) {
  const closes = data.map(d => d.close);
  if (closes.length < 20) return 'HOLD';

  const f = ema(closes, 5), s = ema(closes, 13);
  const r = rsi(closes, 14);
  const i = closes.length - 1, ip = i - 1;
  if (r[i] === null) return 'HOLD';

  // Adaptive: relax RSI filter
  const obThresh = adaptive ? 80 : 70;
  const osThresh = adaptive ? 20 : 30;

  const bullCross = f[ip] <= s[ip] && f[i] > s[i];
  const bearCross = f[ip] >= s[ip] && f[i] < s[i];

  // Also detect near-crossovers when adaptive
  const bullNear = adaptive && (f[i] - s[i]) > 0 && (f[i] - s[i]) / s[i] < 0.001;
  const bearNear = adaptive && (s[i] - f[i]) > 0 && (s[i] - f[i]) / s[i] < 0.001;

  if ((bullCross || bullNear) && r[i] < obThresh) return 'BUY';
  if ((bearCross || bearNear) && r[i] > osThresh) return 'SHORT';

  return 'HOLD';
}

/**
 * Strategy 2: Mean Reversion — RSI extremes with bounce confirmation
 * Returns: BUY | SHORT | HOLD
 */
export function meanRevSignal(data, adaptive = false) {
  const closes = data.map(d => d.close);
  if (closes.length < 20) return 'HOLD';

  const r = rsi(closes, 14);
  const i = closes.length - 1;
  if (r[i] === null || r[i - 1] === null) return 'HOLD';

  // Adaptive: widen RSI bands
  const obThresh = adaptive ? 65 : 70;
  const osThresh = adaptive ? 35 : 30;

  // Oversold bounce: RSI was < threshold, now turning up
  if (r[i - 1] < osThresh && r[i] > r[i - 1]) return 'BUY';
  // Overbought reversal: RSI was > threshold, now turning down
  if (r[i - 1] > obThresh && r[i] < r[i - 1]) return 'SHORT';

  return 'HOLD';
}

/**
 * Combined signal from both strategies.
 * Returns array of { strategy, signal } for each active signal.
 */
export function getSignals(data, lastSignalTime = null, startTime = null) {
  const now = Date.now();
  const refTime = lastSignalTime || startTime || (now - CONFIG.ADAPT_HOURS * 3600 * 1000 - 1);
  const adaptive = (now - refTime) > CONFIG.ADAPT_HOURS * 3600 * 1000;

  const signals = [];
  const ts = trendSignal(data, adaptive);
  const mr = meanRevSignal(data, adaptive);

  if (ts !== 'HOLD') signals.push({ strategy: 'TREND', signal: ts, adaptive });
  if (mr !== 'HOLD') signals.push({ strategy: 'MEANREV', signal: mr, adaptive });

  return signals;
}

// ─── Position Math (single source of truth) ───
export function calcPnlPct(side, entry, current) {
  return side === 'LONG'
    ? (current - entry) / entry * 100
    : (entry - current) / entry * 100;
}

export function closePosition(pos, exitPrice) {
  const pnlPct = calcPnlPct(pos.side, pos.entry, exitPrice);
  let proceeds;
  if (pos.side === 'LONG') {
    proceeds = pos.qty * exitPrice;
  } else {
    proceeds = pos.collateral + pos.qty * (pos.entry - exitPrice);
  }
  return { proceeds, pnlPct };
}

export function openPosition(side, price, capital) {
  const posSize = capital * CONFIG.POSITION_SIZE;
  const qty = posSize / price;
  return {
    position: { side, entry: price, qty, collateral: posSize, openTime: new Date().toISOString() },
    cost: posSize,
  };
}
