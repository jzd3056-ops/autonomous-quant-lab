import fetch from 'node-fetch';
import { writeFileSync } from 'fs';

// --- 1. Fetch BTC/USD from CoinGecko (90 days, ~hourly) ---
async function fetchData() {
  const url = 'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=90';
  const res = await fetch(url);
  const data = await res.json();
  return data.prices.map(([time, price]) => ({ time, close: price, timeStr: new Date(time).toISOString() }));
}

// --- 2. EMA ---
function ema(prices, period) {
  const k = 2 / (period + 1);
  const r = [prices[0]];
  for (let i = 1; i < prices.length; i++) r.push(prices[i] * k + r[i-1] * (1-k));
  return r;
}

// --- 3. RSI ---
function rsi(prices, period = 14) {
  const r = new Array(prices.length).fill(null);
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const d = prices[i] - prices[i-1];
    if (d > 0) gains += d; else losses -= d;
  }
  let ag = gains/period, al = losses/period;
  r[period] = al === 0 ? 100 : 100 - 100/(1+ag/al);
  for (let i = period+1; i < prices.length; i++) {
    const d = prices[i] - prices[i-1];
    ag = (ag*(period-1) + (d>0?d:0))/period;
    al = (al*(period-1) + (d<0?-d:0))/period;
    r[i] = al === 0 ? 100 : 100 - 100/(1+ag/al);
  }
  return r;
}

// --- 4. Strategies ---
function emaCrossover(data, fast=9, slow=21) {
  const closes = data.map(d => d.close);
  const f = ema(closes, fast), s = ema(closes, slow);
  const sigs = [];
  for (let i = 1; i < data.length; i++) {
    if (f[i-1] <= s[i-1] && f[i] > s[i]) sigs.push({i, type:'BUY', price:data[i].close, time:data[i].timeStr});
    else if (f[i-1] >= s[i-1] && f[i] < s[i]) sigs.push({i, type:'SELL', price:data[i].close, time:data[i].timeStr});
  }
  return sigs;
}

function rsiStrategy(data, period=14, lo=30, hi=70) {
  const closes = data.map(d => d.close);
  const r = rsi(closes, period);
  const sigs = [];
  for (let i = 1; i < data.length; i++) {
    if (r[i]===null||r[i-1]===null) continue;
    if (r[i-1]<=lo && r[i]>lo) sigs.push({i, type:'BUY', price:data[i].close, time:data[i].timeStr});
    else if (r[i-1]>=hi && r[i]<hi) sigs.push({i, type:'SELL', price:data[i].close, time:data[i].timeStr});
  }
  return sigs;
}

// Combined: EMA + RSI filter
function combinedStrategy(data) {
  const closes = data.map(d => d.close);
  const f = ema(closes, 9), s = ema(closes, 21);
  const r = rsi(closes, 14);
  const sigs = [];
  for (let i = 1; i < data.length; i++) {
    if (r[i]===null) continue;
    // Buy: EMA golden cross AND RSI < 50 (not overbought)
    if (f[i-1]<=s[i-1] && f[i]>s[i] && r[i]<50) sigs.push({i, type:'BUY', price:data[i].close, time:data[i].timeStr});
    // Sell: EMA death cross OR RSI > 75
    else if ((f[i-1]>=s[i-1] && f[i]<s[i]) || r[i]>75) sigs.push({i, type:'SELL', price:data[i].close, time:data[i].timeStr});
  }
  return sigs;
}

// --- 5. Backtest ---
function backtest(signals, capital=10000) {
  let cash = capital, pos = 0, entry = 0, trades = [];
  for (const s of signals) {
    if (s.type==='BUY' && pos===0) {
      pos = cash/s.price; entry = s.price; cash = 0;
      trades.push({...s, action:'OPEN', qty:pos.toFixed(6)});
    } else if (s.type==='SELL' && pos>0) {
      cash = pos*s.price;
      const pnl = ((s.price-entry)/entry*100).toFixed(2);
      trades.push({...s, action:'CLOSE', qty:pos.toFixed(6), pnl:`${pnl}%`, capital:cash.toFixed(2)});
      pos = 0;
    }
  }
  const finalVal = pos>0 ? pos*signals[signals.length-1]?.price||0 : cash;
  const closed = trades.filter(t=>t.action==='CLOSE');
  const wins = closed.filter(t=>parseFloat(t.pnl)>0).length;
  return {
    initialCapital: capital, finalValue: +finalVal.toFixed(2),
    totalReturn: `${((finalVal-capital)/capital*100).toFixed(2)}%`,
    totalTrades: closed.length, wins, losses: closed.length-wins,
    winRate: closed.length ? `${(wins/closed.length*100).toFixed(1)}%` : 'N/A',
    trades, holding: pos>0
  };
}

// --- MAIN ---
async function main() {
  console.log('Fetching BTC/USD 90-day data from CoinGecko...');
  const data = await fetchData();
  console.log(`Got ${data.length} data points: ${data[0].timeStr} → ${data[data.length-1].timeStr}`);

  const strategies = [
    { name: 'EMA_9_21', fn: () => emaCrossover(data, 9, 21) },
    { name: 'EMA_12_26', fn: () => emaCrossover(data, 12, 26) },
    { name: 'RSI_14', fn: () => rsiStrategy(data) },
    { name: 'Combined_EMA_RSI', fn: () => combinedStrategy(data) },
  ];

  const results = {};
  for (const s of strategies) {
    const sigs = s.fn();
    const r = backtest(sigs);
    results[s.name] = r;
    console.log(`\n=== ${s.name} ===`);
    console.log(`Return: ${r.totalReturn} | Trades: ${r.totalTrades} | Win: ${r.winRate} | Final: $${r.finalValue}`);
  }

  // Pick best
  const best = Object.entries(results).sort((a,b) => b[1].finalValue - a[1].finalValue)[0];
  console.log(`\n🏆 Best: ${best[0]} with ${best[1].totalReturn} return`);

  const report = {
    timestamp: new Date().toISOString(),
    dataRange: { from: data[0].timeStr, to: data[data.length-1].timeStr, points: data.length },
    results,
    bestStrategy: best[0],
  };
  writeFileSync('../logs/backtest-report.json', JSON.stringify(report, null, 2));
  console.log('Report saved.');
}

main().catch(console.error);
