# 定投提醒（DCA Reminder）

在黄金收盘前 10 分钟、美股（纳指、标普）收盘前 10 分钟拉取价格，做均线 + RSI 分析，判断是否适合定投，并推送至 Telegram。

## 标的与时间

| 市场 | 标的 | Yahoo Symbol | 美东收盘前 10 分钟 |
|------|------|--------------|--------------------|
| 黄金 | 黄金期货 | `GC=F` | 16:50，周一至五 |
| 美股 | 纳指 | `^IXIC` | 15:50，周一至五 |
| 美股 | 标普 500 | `^GSPC` | 15:50，周一至五 |

## Cron 与时区

- **黄金**：`50 16 * * 1-5`（美东 16:50，周一至五）
- **美股**：`50 15 * * 1-5`（美东 15:50，周一至五）

若运行环境支持，建议设置 **TZ=America/New_York**，使上述 cron 表达式按美东时间执行。

若服务器固定使用 **Asia/Shanghai**，与美东对应关系为（工作日以美国为准）：

- 美东 15:50 ≈ 上海 **04:50**（冬令时 EST）/ **03:50**（夏令时 EDT）
- 美东 16:50 ≈ 上海 **05:50**（冬令时）/ **04:50**（夏令时）

## 判断规则

- 均线：价格低于 MA60 或 MA20
- RSI：RSI(14) 未严重超买（默认 < 45，可配 `DCA_RSI_MAX`）
- 同时满足时推送「适合定投」，否则「暂不适合」并附简短原因

## 环境变量

- `TELEGRAM_BOT_TOKEN`、`TELEGRAM_CHAT_ID`：推送目标（与 Pharos 通知共用）
- `DCA_RSI_MAX`（可选）：RSI 超过此值不提示适合定投，默认 45

## 手动触发

- **黄金**：`POST /dca/gold`（无 body），触发一次黄金定投分析并推送
- **美股**：`POST /dca/us-indices`（无 body），触发一次纳指+标普定投分析并推送

示例：`curl -X POST http://localhost:PORT/dca/gold`

## 代码位置

- API 手动触发：`src/modules/dca/trigger-gold.step.ts`、`trigger-us-indices.step.ts`
- Cron：`src/modules/dca/gold-schedule.cron.step.ts`、`us-indices-schedule.cron.step.ts`
- Event：`src/modules/dca/gold-dca-analyze.step.ts`、`us-indices-dca-analyze.step.ts`
- 行情与指标：`src/services/market.ts`、`src/services/dca-indicator.ts`
- 推送：`src/services/notification.ts`（`sendDCAAlert`）
