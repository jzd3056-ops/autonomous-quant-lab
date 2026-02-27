# Gen-2 Shared State

## Status: 🟢 RUNNING
- **Started**: 2026-02-27T18:05Z
- **Phase**: Live sim-trading (pm2 managed)
- **BTC Price**: $65,412 (as of 22:31Z)
- **Portfolio**: ~$9,999.50 (-0.005%)
- **Positions**: 1 LONG (MEANREV) — 0.007636 BTC @ $65,478 — unrealized -$0.50
- **Total Trades**: 1 (open)
- **pm2**: online, uptime ~4.5h, 2 restarts, no errors

## Backtest Results
- Trades: 20 | Win Rate: 50.0% | Return: +0.81%
- Config: Trend(EMA 5/13) + MeanRev(RSI 14) | SL=-2% TP=3% | Size=5%

## Current Market
- BTC $65,412 — slightly below entry (-0.10%)
- Position still within normal range, no SL/TP trigger
- Sim-trader running autonomously every 30min

## Risk State
- Daily loss: ~0% (limit: 5%)
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
- **21:31Z**: Routine check — position healthy, BTC rising, no new signals
- **22:01Z**: Routine check — position +$0.45 (+0.09%), pm2 stable
- **22:31Z**: Routine check — BTC dipped to $65,412, position -0.10%, within range
