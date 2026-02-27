/**
 * Gen-1 Backtest — uses SAME lib.mjs as sim-trader.
 * Hourly data, identical signal/sizing/SL/TP logic.
 */
import { fetchHourly, ema, rsi, getSignal, CONFIG, closePosition, openPosition, calcPnlPct } from './lib.mjs';

async function main() {
  const data = await fetchHourly(168); // 7 days hourly
  const closes = data.map(d => d.close);

  let capital = CONFIG.INITIAL_CAPITAL;
  let cash = capital;
  let pos = null;
  let trades = 0, wins = 0;
  const results = [];

  for (let i = 20; i < data.length; i++) {
    const price = closes[i];
    const slice = data.slice(0, i + 1);

    // Check SL/TP on existing position
    if (pos) {
      const pnlPct = calcPnlPct(pos.side, pos.entry, price);
      let shouldClose = false, reason = '';

      if (pnlPct <= CONFIG.STOP_LOSS) { reason = 'SL'; shouldClose = true; }
      else if (pnlPct >= CONFIG.TAKE_PROFIT) { reason = 'TP'; shouldClose = true; }

      // Reversal signal
      const sig = getSignal(slice);
      if (!shouldClose && pos.side === 'LONG' && (sig === 'SHORT' || sig === 'SELL_OVERBOUGHT')) { reason = 'REV'; shouldClose = true; }
      if (!shouldClose && pos.side === 'SHORT' && (sig === 'BUY' || sig === 'BUY_OVERSOLD')) { reason = 'REV'; shouldClose = true; }

      if (shouldClose) {
        const { proceeds, pnlPct: finalPnl } = closePosition(pos, price);
        cash += proceeds;
        trades++;
        if (finalPnl > 0) wins++;
        results.push({ reason, pnl: finalPnl.toFixed(2) + '%', capital: cash.toFixed(2) });
        pos = null;
      }
    }

    // Open new position
    if (!pos) {
      const sig = getSignal(slice);
      if (sig === 'BUY' || sig === 'BUY_OVERSOLD') {
        const { position, cost } = openPosition('LONG', price, cash);
        pos = position;
        cash -= cost;
      } else if (sig === 'SHORT' || sig === 'SELL_OVERBOUGHT') {
        const { position, cost } = openPosition('SHORT', price, cash);
        pos = position;
        cash -= cost;
      }
    }
  }

  // Close final position
  if (pos) {
    const price = closes[closes.length - 1];
    const { proceeds } = closePosition(pos, price);
    cash += proceeds;
    trades++;
    pos = null;
  }

  const finalCapital = cash;
  const ret = ((finalCapital / CONFIG.INITIAL_CAPITAL - 1) * 100).toFixed(2);
  const wr = trades > 0 ? ((wins / trades) * 100).toFixed(1) : '0';

  console.log(`\n=== Gen-1 Backtest ===`);
  console.log(`Trades: ${trades} | Win Rate: ${wr}% | Return: ${ret}% | Final: $${finalCapital.toFixed(2)}`);
  console.log(`Config: EMA(5/13) RSI(14) SL=${CONFIG.STOP_LOSS}% TP=${CONFIG.TAKE_PROFIT}% Size=${CONFIG.POSITION_SIZE * 100}%`);
  console.log(`\nTrade log:`);
  results.forEach((r, i) => console.log(`  #${i + 1}: ${r.reason} ${r.pnl} → $${r.capital}`));
}

main().catch(console.error);
