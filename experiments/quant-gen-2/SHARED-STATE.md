# Gen-2 Shared State

## Status: 🟢 RUNNING
- **Started**: 2026-02-27T18:05Z
- **Phase**: Live sim-trading (pm2 managed)
- **BTC Price**: $65,234 (as of 14:01Z Feb 28) 🚀
- **Portfolio**: ~$10,016 (+0.16%)
- **Positions**: 1 open — MEANREV LONG @ $63,534 (+2.67%) — TP $65,440 imminent!
- **Total Trades**: 2 closed, 1 open (3 total)
- **pm2**: online, uptime ~18h, 2 restarts, no errors

## Backtest Results
- Trades: 20 | Win Rate: 50.0% | Return: +0.81%
- Config: Trend(EMA 5/13) + MeanRev(RSI 14) | SL=-2% TP=3% | Size=5%

## Current Market
- BTC $64,044 — recovering after pullback
- MEANREV LONG @ $63,534: +0.80%
- SL $62,263 / TP $65,440 (TP ~2.2% away)
- Prior trades: TREND SHORT closed TP +3.60%, MEANREV LONG closed SL -2.97%

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
- **07:31Z (Feb 28)**: 🎉 FIRST CLOSES! TREND SHORT hit TP (+3.60%), MEANREV LONG hit SL (-2.97%). Net ~flat. New MEANREV LONG opened @ $63,534. BTC $63,580. Portfolio ~$10,003. 13.5h runtime, 2 closed, 1 open
- **08:01Z (Feb 28)**: Cron check — pm2 online 14h, 0 errors. BTC $63,656. MEANREV LONG +0.19%. Portfolio ~$10,003. SL $62,263 / TP $65,440. 14h runtime, 2 closed, 1 open
- **08:31Z (Feb 28)**: Cron check — pm2 online 14.5h, 0 errors. BTC $63,697. MEANREV LONG +0.26%. Portfolio ~$10,003. BTC stabilizing post-drop. 14.5h runtime, 2 closed, 1 open
- **09:01Z (Feb 28)**: Cron check — pm2 online 15h, 0 errors. BTC $63,572. MEANREV LONG +0.06%. Portfolio ~$10,003. BTC drifting slightly lower. 15h runtime, 2 closed, 1 open
- **09:31Z (Feb 28)**: Cron check — pm2 online 15.5h, 0 errors. BTC $63,792 (bouncing up from $63,554 low). MEANREV LONG +0.41%. Portfolio ~$10,004. Position recovering nicely. 15.5h runtime, 2 closed, 1 open
- **10:01Z (Feb 28)**: Cron check — pm2 online 16h, 0 errors. BTC $63,623. MEANREV LONG +0.14%. Portfolio ~$10,003. BTC slightly down from last check. SL $62,263 / TP $65,440. 16h runtime, 2 closed, 1 open. Day 1 milestone: need 7 more closed trades
- **10:31Z (Feb 28)**: Cron check — pm2 online 16.5h, 0 errors, 2 restarts. BTC $63,611. MEANREV LONG +0.12%. Portfolio ~$10,003 (+0.03%). BTC ranging $63,500-63,800. No new signals. 16.5h runtime, 2 closed, 1 open
- **11:01Z (Feb 28)**: Cron check — pm2 online 17h, 0 errors. BTC $63,941 (uptick!). MEANREV LONG +0.64%. Portfolio ~$10,005 (+0.05%). BTC breaking above $63,900 range. TP $65,440 still 2.3% away. 17h runtime, 2 closed, 1 open
- **11:31Z (Feb 28)**: Cron check — pm2 online 17.5h, 0 errors. BTC $64,295 (continuing uptrend!). MEANREV LONG +1.20%. Portfolio ~$10,008 (+0.08%). TP $65,440 now 1.8% away — closest yet. 17.5h runtime, 2 closed, 1 open
- **12:01Z (Feb 28)**: Cron check — pm2 online 18h, 0 errors. BTC $63,858 (pulled back from $64,295). MEANREV LONG +0.51%. Portfolio ~$10,005 (+0.05%). BTC retraced ~$400, TP $65,440 now 2.5% away. 18h runtime, 2 closed, 1 open
- **12:31Z (Feb 28)**: Cron check — pm2 online 18.5h, 0 errors, 2 restarts. BTC $64,044 (recovering). MEANREV LONG +0.80%. Portfolio ~$10,006 (+0.06%). BTC bouncing back up. TP $65,440 ~2.2% away. 18.5h runtime, 2 closed, 1 open
- **13:01Z (Feb 28)**: Cron check — pm2 online 19h, 0 errors, 2 restarts. BTC $64,031. MEANREV LONG +0.78%. Portfolio ~$10,006 (+0.06%). BTC flat. TP $65,440 ~2.2% away. 19h runtime, 2 closed, 1 open
- **13:31Z (Feb 28)**: Cron check — pm2 online 19.5h, 0 errors, 2 restarts. BTC $64,063. MEANREV LONG +0.83%. Portfolio ~$10,006 (+0.06%). BTC stable $64K range. TP $65,440 ~2.1% away. 19.5h runtime, 2 closed, 1 open
- **14:01Z (Feb 28)**: Cron check — pm2 online 20h, 0 errors, 2 restarts. BTC $65,234 (🚀 +$1,171 surge!). MEANREV LONG +2.67%. TP $65,440 only 0.3% away — likely hitting soon! Portfolio ~$10,016 (+0.16%). 20h runtime, 2 closed, 1 open
