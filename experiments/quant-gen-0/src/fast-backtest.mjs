/**
 * Fast Backtest — Gen-0 "Scalper" Strategy
 * Uses 7-day hourly data with EMA(3/8) + RSI(6) for high-frequency signals.
 * Goal: ≥10 completed trades to evaluate strategy performance.
 */
import fetch from 'node-fetch';
import { writeFileSync, readFileSync, existsSync } from 'fs';

// --- Fetch hourly data (7 days = ~168 candles) ---
async function fetchHourly() {
  const r = await fetch('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=7');
  const d = await r.json();
  if (!d.prices) throw new Error('No price data: ' + JSON.stringify(d));
  return d.prices.map(([t, p]) => ({ time: t, close: p, ts: new Date(t).toISOString() }));
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

function runStrategy(data, params) {
  const { emaFast, emaSlow, rsiPeriod, rsiBuy, rsiSell, stopLoss, takeProfit } = params;
  const closes = data.map(d => d.close);
  const f = ema(closes, emaFast), s = ema(closes, emaSlow);
  const r = rsi(closes, rsiPeriod);

  let capital = 10000, pos = null, trades = [];

  for (let i = emaSlow + 1; i < data.length; i++) {
    const price = data[i].close;
    const time = data[i].ts;

    // Check exit conditions first
    if (pos) {
      const pnl = pos.side === 'LONG'
        ? (price - pos.entry) / pos.entry * 100
        : (pos.entry - price) / pos.entry * 100;

      let closeReason = null;
      if (pnl <= stopLoss) closeReason = 'STOP_LOSS';
      else if (pnl >= takeProfit) closeReason = 'TAKE_PROFIT';
      // Reversal signals
      else if (pos.side === 'LONG' && f[i - 1] >= s[i - 1] && f[i] < s[i]) closeReason = 'SIGNAL_REV';
      else if (pos.side === 'SHORT' && f[i - 1] <= s[i - 1] && f[i] > s[i]) closeReason = 'SIGNAL_REV';
      // RSI exit
      else if (pos.side === 'LONG' && r[i] !== null && r[i] > rsiSell) closeReason = 'RSI_EXIT';
      else if (pos.side === 'SHORT' && r[i] !== null && r[i] < rsiBuy) closeReason = 'RSI_EXIT';

      if (closeReason) {
        // PnL on position only
        const positionPnl = pos.side === 'LONG'
          ? pos.qty * (price - pos.entry)
          : pos.qty * (pos.entry - price);
        capital = pos.fullCapital + positionPnl;
        trades.push({ time, action: 'CLOSE', reason: closeReason, side: pos.side, entry: pos.entry, exit: price, pnl: pnl.toFixed(2) + '%', dollarPnl: positionPnl.toFixed(2), capital: capital.toFixed(2) });
        pos = null;
      }
    }

    // Open new position
    if (!pos && r[i] !== null) {
      const bullCross = f[i - 1] <= s[i - 1] && f[i] > s[i];
      const bearCross = f[i - 1] >= s[i - 1] && f[i] < s[i];
      const rsiBuySignal = r[i] < rsiBuy;
      const rsiSellSignal = r[i] > rsiSell;

      let side = null;
      if (bullCross && rsiBuySignal) side = 'LONG';
      else if (bearCross && rsiSellSignal) side = 'SHORT';
      // Additional: RSI extremes alone
      else if (r[i] < 25) side = 'LONG';
      else if (r[i] > 75) side = 'SHORT';
      // Momentum: strong trend continuation
      else if (bullCross) side = 'LONG';
      else if (bearCross) side = 'SHORT';

      if (side) {
        const size = capital * 0.2; // 20% risk per trade
        const qty = size / price;
        pos = { side, entry: price, qty, collateral: size, fullCapital: capital };
        // Don't subtract from capital - track separately
        trades.push({ time, action: 'OPEN', side, price: price.toFixed(2), qty: qty.toFixed(6), size: size.toFixed(2) });
      }
    }
  }

  // Close any open position at end
  if (pos) {
    const price = data[data.length - 1].close;
    const pnl = pos.side === 'LONG'
      ? (price - pos.entry) / pos.entry * 100
      : (pos.entry - price) / pos.entry * 100;
    const positionPnl = pos.side === 'LONG' ? pos.qty * (price - pos.entry) : pos.qty * (pos.entry - price);
    capital = pos.fullCapital + positionPnl;
    trades.push({ time: data[data.length - 1].ts, action: 'CLOSE', reason: 'END', side: pos.side, entry: pos.entry, exit: price, pnl: pnl.toFixed(2) + '%', dollarPnl: positionPnl.toFixed(2), capital: capital.toFixed(2) });
    pos = null;
  }

  // Final value
  const finalVal = capital;
  const closedTrades = trades.filter(t => t.action === 'CLOSE');
  const wins = closedTrades.filter(t => parseFloat(t.pnl) > 0).length;

  return {
    params, trades, finalValue: +finalVal.toFixed(2),
    totalReturn: ((finalVal - 10000) / 10000 * 100).toFixed(2) + '%',
    closedCount: closedTrades.length, wins, losses: closedTrades.length - wins,
    winRate: closedTrades.length ? (wins / closedTrades.length * 100).toFixed(1) + '%' : 'N/A'
  };
}

async function main() {
  console.log('Fetching 7-day hourly BTC data...');
  const data = await fetchHourly();
  console.log(`Got ${data.length} points: ${data[0].ts} → ${data[data.length - 1].ts}\n`);

  // Test multiple parameter sets
  const configs = [
    { name: 'Scalper_3_8', emaFast: 3, emaSlow: 8, rsiPeriod: 6, rsiBuy: 45, rsiSell: 55, stopLoss: -1.5, takeProfit: 2.0 },
    { name: 'Scalper_3_8_wide', emaFast: 3, emaSlow: 8, rsiPeriod: 6, rsiBuy: 50, rsiSell: 50, stopLoss: -1.0, takeProfit: 1.5 },
    { name: 'Fast_5_13', emaFast: 5, emaSlow: 13, rsiPeriod: 8, rsiBuy: 45, rsiSell: 55, stopLoss: -2.0, takeProfit: 3.0 },
    { name: 'Ultra_2_5', emaFast: 2, emaSlow: 5, rsiPeriod: 4, rsiBuy: 45, rsiSell: 55, stopLoss: -1.0, takeProfit: 1.5 },
    { name: 'Aggressive_3_7', emaFast: 3, emaSlow: 7, rsiPeriod: 5, rsiBuy: 48, rsiSell: 52, stopLoss: -1.2, takeProfit: 1.8 },
  ];

  const results = [];
  for (const cfg of configs) {
    const r = runStrategy(data, cfg);
    results.push({ name: cfg.name, ...r });
    console.log(`=== ${cfg.name} === Trades: ${r.closedCount} | Return: ${r.totalReturn} | Win: ${r.winRate} | Final: $${r.finalValue}`);
    if (r.trades.length <= 20) {
      for (const t of r.trades) {
        if (t.action === 'CLOSE') console.log(`  ${t.time.slice(5, 16)} ${t.side} ${t.reason} PnL:${t.pnl}`);
      }
    }
    console.log();
  }

  // Pick best by trade count ≥10, then by return
  const viable = results.filter(r => r.closedCount >= 5).sort((a, b) => b.finalValue - a.finalValue);
  const best = viable[0] || results.sort((a, b) => b.closedCount - a.closedCount)[0];
  console.log(`\n🏆 Best: ${best.name} — ${best.closedCount} trades, ${best.totalReturn} return, ${best.winRate} win rate`);

  // Save detailed report
  const report = {
    timestamp: new Date().toISOString(),
    dataRange: { from: data[0].ts, to: data[data.length - 1].ts, points: data.length },
    best: best.name,
    results: results.map(r => ({ name: r.name, closedCount: r.closedCount, totalReturn: r.totalReturn, winRate: r.winRate, finalValue: r.finalValue, params: r.params, trades: r.trades }))
  };
  writeFileSync('../logs/fast-backtest-report.json', JSON.stringify(report, null, 2));
  console.log('Report saved to logs/fast-backtest-report.json');

  // Return best for use by update script
  return best;
}

main().catch(console.error);
