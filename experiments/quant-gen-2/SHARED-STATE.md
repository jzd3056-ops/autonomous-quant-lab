# Gen-2 Shared State

## Status: 🟢 RUNNING
- **Started**: 2026-02-27T18:05Z
- **Phase**: Live sim-trading (pm2 managed)
- **BTC Price**: $64,342 (as of 07:01Z Feb 28) ⚠️ SHARP DROP
- **Portfolio**: ~$10,003 (+0.03%)
- **Positions**: 2 open — MEANREV LONG @ $65,478 (-1.73%) + TREND SHORT @ $65,904 (+2.37%)
- **Total Trades**: 0 closed, 2 open
- **pm2**: online, uptime ~13h, 2 restarts, no errors

## Backtest Results
- Trades: 20 | Win Rate: 50.0% | Return: +0.81%
- Config: Trend(EMA 5/13) + MeanRev(RSI 14) | SL=-2% TP=3% | Size=5%

## Current Market
- BTC $64,342 — sharp drop from $65,500 range. Breakout happening!
- MEANREV LONG: -1.73%, approaching SL $64,169 (only $173 away!)
- TREND SHORT: +2.37%, approaching TP $63,927 (only $415 away!)
- ⚠️ Hedged position absorbing volatility — portfolio flat despite BTC -1.8%

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
- **02:01Z (Feb 28)**: Cron check — pm2 online 8h, BTC $65,803, position +0.50%, holding steady. Only 1 open trade in 8h — trend strategy hasn't fired yet
- **02:31Z (Feb 28)**: Cron check — pm2 online 8.5h, BTC $65,917, position +0.67%, trending up slightly. TP target $67,443 still ~2.3% away. Trend strategy still quiet
- **03:01Z (Feb 28)**: Cron check — pm2 online 9h, BTC $65,966, position +0.74%, portfolio ~$10,003.72. Stable uptrend. TP $67,443 ~2.2% away. Trend strategy still no signal. 9h runtime, 1 open trade
- **03:02Z (Feb 28)**: 🎉 TREND SHORT opened! 0.007208 BTC @ $65,904 (adaptive signal). Now 2 positions open (hedged)
- **03:31Z (Feb 28)**: Cron check — pm2 online 9.5h, BTC $65,906. 2 positions: MEANREV LONG +0.65%, TREND SHORT ±0%. Portfolio ~$10,003.27. Hedged exposure, waiting for breakout
- **04:01Z (Feb 28)**: Cron check — pm2 online 10h, BTC $65,790. MEANREV LONG +0.48%, TREND SHORT +0.17%. Portfolio ~$10,003. Hedged, ranging market, waiting for breakout
- **04:31Z (Feb 28)**: Cron check — pm2 online 10.5h, BTC $65,519 (dipping). MEANREV LONG +0.06%, TREND SHORT +0.58%. Hedged positions offsetting — SHORT benefiting from dip. Portfolio ~$10,003. SL levels: LONG $64,169, SHORT $67,222
- **05:01Z (Feb 28)**: Cron check — pm2 online 11h, 0 errors. BTC $65,658. MEANREV LONG +0.27%, TREND SHORT +0.37%. Portfolio ~$10,003. Hedged, ranging market. No new signals. 2 open, 0 closed trades
- **05:31Z (Feb 28)**: Cron check — pm2 online 11.5h, 0 errors. BTC $65,598. MEANREV LONG +0.18%, TREND SHORT +0.46%. Portfolio ~$10,003. Hedged, BTC drifting lower in tight range. 2 open, 0 closed trades
- **06:01Z (Feb 28)**: Cron check — pm2 online 12h, 0 errors. BTC $65,537. MEANREV LONG +0.09%, TREND SHORT +0.56%. Portfolio ~$10,003. Hedged positions stable, BTC continuing slow drift down. 2 open, 0 closed trades. 12h runtime
- **06:31Z (Feb 28)**: Cron check — pm2 online 12.5h, 0 errors. BTC $65,570. MEANREV LONG +0.14%, TREND SHORT +0.51%. Portfolio ~$10,003. Hedged, BTC flat in $65,500-65,600 range. 2 open, 0 closed trades. Neither TP nor SL close
- **07:01Z (Feb 28)**: ⚠️ BTC FLASH DROP to $64,342! MEANREV LONG -1.73% (SL $64,169 imminent), TREND SHORT +2.37% (TP $63,927 close). Hedged portfolio stable at ~$10,003. First exits likely on next check cycle. 13h runtime, 2 open, 0 closed
