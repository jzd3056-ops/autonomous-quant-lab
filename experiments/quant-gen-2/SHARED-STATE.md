# Gen-2 Shared State

## Status: 🟢 RUNNING
- **Started**: 2026-02-27T18:05Z
- **Phase**: Live sim-trading (pm2 managed)
- **BTC Price**: $65,559 (as of 21:01Z)
- **Portfolio**: ~$10,000.62 (+0.006%)
- **Positions**: 1 LONG (MEANREV) — 0.007636 BTC @ $65,478 — unrealized +$0.62
- **Total Trades**: 1 (open)
- **pm2**: online, uptime 119m, 2 restarts

## Backtest Results
- Trades: 20 | Win Rate: 50.0% | Return: +0.81%
- Config: Trend(EMA 5/13) + MeanRev(RSI 14) | SL=-2% TP=3% | Size=5%

## Current Market
- BTC $65,559 — up ~$81 from entry
- Position in profit, no risk triggers hit

## Risk State
- Daily loss: 0% (limit: 5%)
- Consecutive losses: 0 (limit: 3)
- No pause active

## Milestones
- [x] Hour 2: Backtest complete ✅
- [x] Hour 3: First simulated trade ✅ (20:32Z — MEANREV adaptive LONG)
- [ ] Day 1: 10 trades + evaluation
- [ ] Day 3: Cumulative positive return

## Hotfix Log
- **19:02Z**: Fixed adaptive entry bug — lastSignalTime=null fallback to startTime
- **19:02Z**: Loosened mean reversion RSI thresholds (30/70 normal, 35/65 adaptive)
- **20:32Z**: 🎉 First trade! MEANREV adaptive LONG @ $65,478
