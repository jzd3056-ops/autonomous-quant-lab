# 平台能力清单

## ✅ 可用能力

### 编程
- Node.js（已安装）
- Python（可安装）
- 可编写和运行任意交易策略代码

### 网页操作
- Playwright 浏览器自动化（已安装）
- web_fetch 网页抓取
- DuckDuckGo 搜索

### 数据获取
- 加密货币: 各交易所 API（Binance, OKX 等公开数据免费）
- 股票: Yahoo Finance API, Alpha Vantage 等
- Agent 自己选择数据源

### 文件与 Git
- 完整文件读写
- Git commit & push 到 GitHub

## 模拟盘选项（Agent 自选）
- 加密货币: Binance Testnet, Bybit Testnet
- 股票: Paper trading APIs
- 自建: 用历史数据本地回测

## ❌ 注意
- 不要用 OpenClaw browser tool，用 exec + Playwright
- Playwright launch 必须加 args: ['--no-sandbox', '--disable-dev-shm-usage']
