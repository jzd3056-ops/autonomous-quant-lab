/**
 * Gen-2 Backtest — Dual strategy, same lib.mjs as sim-trader.
 * Hourly data, 7 days.
 */
import { fetchHourly, CONFIG, closePosition, openPosition, calcPnlPct, trendSignal, meanRevSignal } from './lib.mjs';

async function main() {
  const data = await fetchHourly(168);
  const closes = data.map(d => d.close);

  let cash = CONFIG.INITIAL_CAPITAL;
  let positions = []; // can hold up to 2 (one per strategy)
  let trades = 0, wins = 0;
  const results = [];
  let lastSignalTime = data[20].time;

  for (let i = 20; i < data.length; i++) {
    const price = closes[i];
    const slice = data.slice(0, i + 1);
    const now = data[i].time;
    const adaptive = (now - lastSignalTime) > CONFIG.ADAPT_HOURS * 3600 * 1000;

    // Check SL/TP on existing positions
    for (let p = positions.length - 1; p >= 0; p--) {
      const pos = positions[p];
      const pnlPct = calcPnlPct(pos.side, pos.entry, price);
      let shouldClose = false, reason = '';

      if (pnlPct <= CONFIG.STOP_LOSS) { reason = 'SL'; shouldClose = true; }
      else if (pnlPct >= CONFIG.TAKE_PROFIT) { reason = 'TP'; shouldClose = true; }

      // Check reversal for this strategy
      const sig = pos.strategy === 'TREND' ? trendSignal(slice, adaptive) : meanRevSignal(slice, adaptive);
      if (!shouldClose && pos.side === 'LONG' && sig === 'SHORT') { reason = 'REV'; shouldClose = true; }
      if (!shouldClose && pos.side === 'SHORT' && sig === 'BUY') { reason = 'REV'; shouldClose = true; }

      if (shouldClose) {
        const { proceeds, pnlPct: finalPnl } = closePosition(pos, price);
        cash += proceeds;
        trades++;
        if (finalPnl > 0) wins++;
        results.push({ strategy: pos.strategy, reason, pnl: finalPnl.toFixed(2) + '%', capital: cash.toFixed(2) });
        positions.splice(p, 1);
      }
    }

    // Open new positions (one per strategy max)
    const activeStrategies = new Set(positions.map(p => p.strategy));

    if (!activeStrategies.has('TREND')) {
      const ts = trendSignal(slice, adaptive);
      if (ts !== 'HOLD') {
        lastSignalTime = now;
        const side = ts === 'BUY' ? 'LONG' : 'SHORT';
        const { position, cost } = openPosition(side, price, cash);
        position.strategy = 'TREND';
        positions.push(position);
        cash -= cost;
      }
    }

    if (!activeStrategies.has('MEANREV')) {
      const mr = meanRevSignal(slice, adaptive);
      if (mr !== 'HOLD') {
        lastSignalTime = now;
        const side = mr === 'BUY' ? 'LONG' : 'SHORT';
        const { position, cost } = openPosition(side, price, cash);
        position.strategy = 'MEANREV';
        positions.push(position);
        cash -= cost;
      }
    }
  }

  // Close remaining
  const lastPrice = closes[closes.length - 1];
  for (const pos of positions) {
    const { proceeds, pnlPct } = closePosition(pos, lastPrice);
    cash += proceeds;
    trades++;
    if (pnlPct > 0) wins++;
    results.push({ strategy: pos.strategy, reason: 'END', pnl: pnlPct.toFixed(2) + '%', capital: cash.toFixed(2) });
  }

  const ret = ((cash / CONFIG.INITIAL_CAPITAL - 1) * 100).toFixed(2);
  const wr = trades > 0 ? ((wins / trades) * 100).toFixed(1) : '0';

  console.log(`\n=== Gen-2 Backtest (Dual Strategy) ===`);
  console.log(`Trades: ${trades} | Win Rate: ${wr}% | Return: ${ret}% | Final: $${cash.toFixed(2)}`);
  console.log(`Config: Trend(EMA 5/13) + MeanRev(RSI 14) | SL=${CONFIG.STOP_LOSS}% TP=${CONFIG.TAKE_PROFIT}% Size=${CONFIG.POSITION_SIZE * 100}%`);
  console.log(`Adaptive: after ${CONFIG.ADAPT_HOURS}h no signal, thresholds loosen ${((1 - CONFIG.ADAPT_FACTOR) * 100).toFixed(0)}%`);
  console.log(`\nTrade log:`);
  results.forEach((r, i) => console.log(`  #${i + 1} [${r.strategy}]: ${r.reason} ${r.pnl} → $${r.capital}`));
}

main().catch(console.error);
