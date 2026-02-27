/**
 * Shared library for Gen-1: indicators, signal generation, risk management.
 * Used by BOTH backtest and sim-trader to guarantee identical logic.
 */
import fetch from 'node-fetch';

// ─── Data ───
export async function fetchHourly(hours = 168) {
  try {
    const r = await fetch(`https://min-api.cryptocompare.com/data/v2/histohour?fsym=BTC&tsym=USD&limit=${hours}`);
    const d = await r.json();
    return d.Data.Data.map(c => ({ time: c.time * 1000, close: c.close }));
  } catch (e) {
    const r = await fetch(`https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${Math.ceil(hours/24)}`);
    const d = await r.json();
    return d.prices.map(([t, p]) => ({ time: t, close: p }));
  }
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

// ─── Signal (conservative vs Gen-0) ───
// EMA 5/13, RSI 14, bands 30/70 — standard params, less noise
export function getSignal(data) {
  const closes = data.map(d => d.close);
  if (closes.length < 20) return 'HOLD';

  const f = ema(closes, 5), s = ema(closes, 13);
  const r = rsi(closes, 14);
  const i = closes.length - 1, ip = i - 1;

  if (r[i] === null) return 'HOLD';

  const bullCross = f[ip] <= s[ip] && f[i] > s[i];
  const bearCross = f[ip] >= s[ip] && f[i] < s[i];

  if (bullCross && r[i] < 70) return 'BUY';
  if (bearCross && r[i] > 30) return 'SHORT';
  if (r[i] > 75) return 'SELL_OVERBOUGHT';
  if (r[i] < 25) return 'BUY_OVERSOLD';

  return 'HOLD';
}

// ─── Position sizing & PnL (single source of truth) ───
export const CONFIG = {
  POSITION_SIZE: 0.05,  // 5% of capital
  STOP_LOSS: -1.5,      // %
  TAKE_PROFIT: 2.0,     // %
  DAILY_LOSS_LIMIT: 5,  // % of initial capital
  CONSEC_LOSS_PAUSE: 3, // consecutive losses before pause
  PAUSE_MINUTES: 15,
  INITIAL_CAPITAL: 10000,
};

/**
 * Calculate PnL % for a position.
 */
export function calcPnlPct(side, entry, current) {
  return side === 'LONG'
    ? (current - entry) / entry * 100
    : (entry - current) / entry * 100;
}

/**
 * Close a position. Returns the capital freed (cash that was reserved + PnL).
 * This is the ONLY place position closing math lives.
 */
export function closePosition(pos, exitPrice) {
  const pnlPct = calcPnlPct(pos.side, pos.entry, exitPrice);
  let proceeds;
  if (pos.side === 'LONG') {
    proceeds = pos.qty * exitPrice;  // sell the BTC
  } else {
    proceeds = pos.collateral + pos.qty * (pos.entry - exitPrice);  // collateral ± diff
  }
  return { proceeds, pnlPct };
}

/**
 * Open a position. Returns the position object and capital to deduct.
 */
export function openPosition(side, price, capital) {
  const posSize = capital * CONFIG.POSITION_SIZE;
  const qty = posSize / price;
  return {
    position: { side, entry: price, qty, collateral: posSize, openTime: new Date().toISOString() },
    cost: posSize,
  };
}
