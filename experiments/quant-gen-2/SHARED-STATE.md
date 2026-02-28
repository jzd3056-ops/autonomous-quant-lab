# Gen-2 Shared State

## Status: 🟢 RUNNING
- **Started**: 2026-02-27T18:05Z
- **Phase**: Live sim-trading (pm2 managed)
- **BTC Price**: $64,922 (as of 16:32Z Feb 28)
- **Portfolio**: ~$10,014 (+0.14%)
- **Positions**: 2 open — MEANREV LONG @ $63,534 (+1.85%), TREND SHORT @ $65,009 (+0.46%)
- **Total Trades**: 4 closed, 2 open (6 total entries)
- **pm2**: online, uptime ~20h, 2 restarts, 0 errors

## Backtest Results
- Trades: 20 | Win Rate: 50.0% | Return: +0.81%
- Config: Trend(EMA 5/13) + MeanRev(RSI 14) | SL=-2% TP=3% | Size=5%

## Trade History
| # | Strategy | Side | Entry | Exit | PnL | Time |
|---|----------|------|-------|------|-----|------|
| 1 | MEANREV | LONG | $65,478 | $63,534 (SL) | -2.97% | 27T20:32→28T07:02 |
| 2 | TREND | SHORT | $65,904 | $63,534 (TP) | +3.60% | 28T03:02→28T07:02 |
| 3 | MEANREV | LONG | $63,534 | — (open) | +1.85% | 28T07:02→ |
| 4 | TREND | SHORT | $65,009 | — (open) | +0.46% | 28T14:02→ |

## Current Positions
- **MEANREV LONG** @ $63,534: qty 0.007872 BTC, SL $62,263, TP $65,440 (TP ~1.1% away!)
- **TREND SHORT** @ $65,009: qty 0.007308 BTC, SL $66,309, TP $63,059

## Risk State
- Daily loss: ~0% (limit: 5%)
- Consecutive losses: 0 (limit: 3)
- No pause active

## Milestones
- [x] Hour 2: Backtest complete ✅
- [x] Hour 3: First simulated trade ✅
- [ ] Day 1: 10 trades + evaluation (4 closed needed, have 2 closed — ~20h in)
- [ ] Day 3: Cumulative positive return

## Hotfix Log
- **14:31Z (Feb 28)**: Cron check — pm2 online 20h, BTC $64,709. 2 positions open: MEANREV LONG +1.85% (near TP!), TREND SHORT +0.46%. Portfolio ~$10,014. New TREND SHORT opened at 14:02Z. System healthy.
- **15:01Z (Feb 28)**: Cron check — pm2 online 21h, BTC $64,493. MEANREV LONG +1.51%, TREND SHORT +0.79%. Portfolio ~$10,014 (+0.14%). Both positions healthy. System stable.
- **15:34Z (Feb 28)**: Cron check — pm2 online 20h+, BTC $64,666. MEANREV LONG +1.78%, TREND SHORT +0.53%. Portfolio $10,013.65 (+0.14%). 2 open positions, 2 closed trades. System healthy, no errors.
- **16:02Z (Feb 28)**: Cron check — pm2 online 20h+, BTC $64,841. MEANREV LONG +2.06%, TREND SHORT +0.26%. Portfolio ~$10,014 (+0.14%). Both positions healthy. 0 pm2 errors. System stable.
- **16:32Z (Feb 28)**: Cron check — pm2 online 22h, BTC $64,922. MEANREV LONG +2.18% (TP $65,440 only 0.8% away!), TREND SHORT +0.13%. Portfolio ~$10,014 (+0.14%). 0 errors. System stable.
