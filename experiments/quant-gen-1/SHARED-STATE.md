# Gen-1 Shared State

## Status: 🟢 ACTIVE
- **Started**: 2026-02-27T12:02Z
- **Last Check**: 2026-02-27T12:31Z
- **BTC Price**: $66,008
- **Signal**: HOLD
- **Portfolio**: $10,000.00 (0.00%)
- **Position**: NONE
- **Total Trades**: 0

## Backtest Results (7-day hourly)
- Trades: 13 | Win Rate: 46.2% | Return: +0.36%
- Config: EMA(5/13) RSI(14) SL=-1.5% TP=2.0% Size=5%

## Gen-0 Bug Fixes Applied
1. ✅ Capital tracking: cash + position separated (Gen-0 lost cash on close)
2. ✅ Position size: 5% (was 20%)
3. ✅ Risk controls: daily loss >5% pause, 3 consecutive losses → 15min pause
4. ✅ DEATH → process.exit(1) (Gen-0 just logged)
5. ✅ Shared lib.mjs: backtest & sim-trader use identical logic
6. ✅ Same hourly timeframe for both

## Milestones
- [x] Hour 0: Code + backtest complete
- [ ] Hour 2: Backtest verified ✅ (done early)
- [ ] Hour 6: First simulated trade
- [ ] Day 1: 10 trades + evaluation
- [ ] Day 3: Cumulative positive returns
