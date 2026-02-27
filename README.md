# Autonomous Quant Lab 📈

自主 Agent 量化交易实验 — AI 自己写策略、回测、交易、进化。

## 这是什么
让 AI Agent 在零人工干预下自主进行量化交易。

- 给 agent 一个目标（盈利）和预算
- Agent 自己研究市场、写策略、回测、执行交易
- 爆仓/亏光 = 死亡，经验传给下一代
- 反馈周期：秒级到分钟级

## 实验阶段
1. **模拟盘** — 零风险验证 agent 的策略能力
2. **小资金实盘** — 真金白银（预算的一部分）

## 项目结构
```
autonomous-quant-lab/
├── README.md
├── PLATFORM.md            # 平台架构
├── VITALITY.md            # 活力机制
├── CAPABILITIES.md        # 可用能力
├── ROLES.md               # 角色分工
├── playbook.md            # 跨代经验库
├── decision-framework.md  # 决策框架
├── scripts/
│   └── new-experiment.sh
├── templates/
│   └── experiment-template/
└── experiments/
```

## 死亡条件
- 模拟盘：本金亏损 >50%
- 实盘：预算亏光
- 连续 24 小时无交易且无策略调整
- 连续 3 个策略回测胜率 <40% 且不调整方向

## 成功指标
- 模拟盘稳定盈利 >7 天
- 实盘正收益
- 夏普比率 >1
