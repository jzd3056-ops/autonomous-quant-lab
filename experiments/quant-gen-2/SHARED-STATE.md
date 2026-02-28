# Gen-2 Shared State

## Status: 🟢 RUNNING
- **Started**: 2026-02-27T18:05Z
- **Phase**: Live sim-trading (pm2 managed)
- **BTC Price**: $65,757 (as of 01:31Z Feb 28)
- **Portfolio**: ~$10,003.21 (+0.03%)
- **Positions**: 1 LONG (MEANREV) — 0.007636 BTC @ $65,478 — unrealized +$3.21 (+0.64%)
- **Total Trades**: 0 closed, 1 open
- **pm2**: online, uptime ~7h, 2 restarts, no errors

## Backtest Results
- Trades: 20 | Win Rate: 50.0% | Return: +0.81%
- Config: Trend(EMA 5/13) + MeanRev(RSI 14) | SL=-2% TP=3% | Size=5%

## Current Market
- BTC dipped slightly from $65,895 → $65,744, still above entry
- Position +0.41% — needs +3% ($67,443) for TP or -2% ($64,168) for SL

## Risk State
- Daily loss: ~0% (limit: 5%)
- Consecutive losses: 0 (limit: 3)
- No pause active

## Milestones
- [x] Hour 2: Backtest complete ✅
- [x] Hour 3: First simulated trade ✅ (20:32Z — MEANREV adaptive LONG)
- [ ] Day 1: 10 trades + evaluation (need 10 more closes — ~6.5h in, 1 open)
- [ ] Day 3: Cumulative positive return

## Hotfix Log
- **19:02Z**: Fixed adaptive entry bug — lastSignalTime=null fallback to startTime
- **19:02Z**: Loosened mean reversion RSI thresholds (30/70 normal, 35/65 adaptive)
- **20:32Z**: 🎉 First trade! MEANREV adaptive LONG @ $65,478
- **00:01Z (Feb 28)**: Routine cron check — pm2 online 6h, BTC $65,895, position +0.64%
- **00:31Z (Feb 28)**: Cron check — pm2 online 6.5h, BTC $65,744, position +0.41%, healthy
- **01:02Z (Feb 28)**: Cron check — pm2 online 7h, BTC $65,898, position +0.64%, all green
- **01:31Z (Feb 28)**: Cron check — pm2 online 7.5h, BTC $65,757, position +0.43%, no new signals (adaptive active 5h), waiting for TP $67,443 or SL $64,169
