# quant-gen-0 Session Log

## 2026-02-27 06:15 UTC - Genesis

### M1: 首次回测 ✅
- 获取 BTC/USD 90天数据 (2161 data points, CoinGecko)
- 回测4个策略:
  - EMA 9/21: -18.35%, 48 trades, 20.8% win rate
  - EMA 12/26: -20.62%, 36 trades, 19.4% win rate  
  - RSI 14: -19.87%, 7 trades, 42.9% win rate
  - Combined EMA+RSI: -0.25%, 1 trade, 0% win rate ← Best
- 观察: BTC过去90天处于下跌趋势（~$90k → ~$67k），纯做多策略难以盈利
- 选择 Combined 策略作为主策略，因为它最好地避免了错误信号

### 模拟盘启动
- 初始资金: $10,000
- 首次检查: BTC=$67,680, Signal=HOLD
- 引擎: sim-trader.mjs (支持 LONG/SHORT, 止损-3%, 止盈+5%)

### 待优化
1. 加入做空能力（已实现信号，待验证）
2. 考虑加入 MACD 或布林带
3. 需要更频繁的数据（当前受API限速）
4. 探索 CryptoCompare 作为备用数据源
