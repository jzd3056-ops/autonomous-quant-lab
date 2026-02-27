# Gen-2 Shared State

## Status: 🟢 RUNNING
- **Started**: 2026-02-27T18:05Z
- **Phase**: Live sim-trading (pm2 managed)
- **BTC Price**: $65,321 (as of 19:02Z)
- **Portfolio**: $10,000.00 (0.00%)
- **Positions**: NONE
- **Total Trades**: 0

## Backtest Results (updated)
- Trades: 20 | Win Rate: 50.0% | Return: +0.81%
- Config: Trend(EMA 5/13) + MeanRev(RSI 14) | SL=-2% TP=3% | Size=5%

## Hotfix Log
- **19:02Z**: Fixed adaptive entry bug — lastSignalTime=null caused adaptive to never trigger. Now uses startTime as fallback. Also loosened mean reversion RSI thresholds (25/75→30/70 normal, 28/72→35/65 adaptive). BTC RSI=32.3 — adaptive BUY signal will trigger at ~20:05Z (2h mark).

## Milestones
- [x] Hour 2: Backtest complete ✅
- [ ] Hour 6: First simulated trade (ETA: ~20:05Z when adaptive kicks in)
- [ ] Day 1: 10 trades + evaluation
- [ ] Day 3: Cumulative positive return

## Key Improvements over Gen-1
1. Dual strategy (trend + mean reversion) — 20 trades in backtest
2. Adaptive entry: loosens after 2h no signal (FIXED: was broken due to null check)
3. pm2 keep-alive (0 restarts so far)
4. Looser mean reversion thresholds for more opportunities
