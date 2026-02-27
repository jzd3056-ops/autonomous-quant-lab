# Gen-2 Shared State

## Status: 🟢 RUNNING
- **Started**: 2026-02-27T18:05Z
- **Phase**: Live sim-trading (pm2 managed)
- **BTC Price**: $65,376 (as of 19:31Z)
- **Portfolio**: $10,000.00 (0.00%)
- **Positions**: NONE
- **Total Trades**: 0
- **pm2**: online, uptime 28m, 2 restarts

## Backtest Results
- Trades: 20 | Win Rate: 50.0% | Return: +0.81%
- Config: Trend(EMA 5/13) + MeanRev(RSI 14) | SL=-2% TP=3% | Size=5%

## Current Market
- BTC RSI(14): 33.2 (oversold zone, bouncing)
- EMA5 < EMA13 (bearish trend, -0.82% gap)
- MeanRev adaptive BUY signal ready — will trigger once adaptive kicks in at ~20:05Z

## Next Expected Action
- **~20:05Z**: Adaptive mode activates (2h mark). MeanRev BUY signal should fire → LONG $500 (~0.00765 BTC)
- This will be Gen-2's first trade 🎯

## Milestones
- [x] Hour 2: Backtest complete ✅
- [ ] Hour 6: First simulated trade (ETA: ~20:05Z — 34 min away)
- [ ] Day 1: 10 trades + evaluation
- [ ] Day 3: Cumulative positive return

## Hotfix Log
- **19:02Z**: Fixed adaptive entry bug — lastSignalTime=null fallback to startTime
- **19:02Z**: Loosened mean reversion RSI thresholds (30/70 normal, 35/65 adaptive)
