# Pharos Airdrop Executor

基于 [Motia](https://motia.dev) 的 Pharos 签到与任务执行系统，支持多钱包、定时签到、发交易、任务验证与 Telegram 通知。开源可自部署，适合参与 Pharos 测试网撸毛与自动化任务。

---

## 功能概览

- **多钱包管理**：钱包信息存 Supabase，私钥加密存储（AES-256-GCM），支持从助记词/私钥加密后入库
- **Pharos 全流程**：登录 → 签到 → 拉取积分 → 领水（已绑定 X 时）→ 查余额 → 发交易 → 等确认 → 任务验证 → 再拉一次积分
- **单步容错**：签到/领水/拉 profile 失败不阻塞后续步骤，失败原因用接口返回的 `msg` 打日志
- **定时与手动**：Cron 每日定时为所有钱包执行签到；支持 HTTP 接口手动触发指定钱包
- **Telegram 通知**：全流程结束后发送一条汇总消息（登录、签到、积分、领水、发交易笔数、验证结果）
- **Workbench**：Motia 自带可视化与日志，便于调试与观察流程

---

## 文档与代码结构

| 路径 | 说明 |
|------|------|
| [docs/wallets-schema.sql](docs/wallets-schema.sql) | 钱包表结构（PostgreSQL/Supabase），含加密列说明与索引 |
| [.github/workflows/deploy.yml](.github/workflows/deploy.yml) | CI：用 Secrets 生成 .env、构建镜像、可选部署到 VPS |
| [AGENTS.md](AGENTS.md) | 面向 AI 助手的 Motia 项目说明与规则索引 |
| [.cursor/rules/](.cursor/rules/) | Motia 步骤、API、Event、Cron 等开发规范（可选阅读） |

**主要代码目录：**

```
src/
├── api/                    # HTTP 接口
│   └── wallet-encrypt.step.ts   # POST /wallet/encrypt 加密私钥/助记词
├── modules/pharos/         # Pharos 流程
│   ├── checkin.step.ts         # 签到事件处理（登录、签到、领水、发交易、验证、通知）
│   ├── schedule.cron.step.ts   # 定时触发（每日）
│   └── trigger-checkin.step.ts # POST /pharos/checkin 手动触发
├── repositories/          # 数据访问
│   └── wallet.repository.ts
├── services/              # 业务与外部 API
│   ├── pharos.client.ts       # Pharos API 封装（登录、签到、profile、领水、verifyTask）
│   ├── notification.ts        # Telegram 汇总消息
│   └── ethereum.ts
└── utils/                 # 通用工具（HTTP、ethers、加解密、UA、Telegram）
```

---

## 快速开始

### 环境要求

- **Node.js** 18+
- **Redis**（Motia 事件队列，本地可用内存模式）
- **Supabase** 项目（存钱包表）
- **Pharos 相关**：RPC、API Base、Domain 等（见下方环境变量）

### 1. 克隆与安装

```bash
git clone https://github.com/unodrop/airdrop-motia-executor.git
cd airdrop-motia-executor
bun install
```

### 2. 数据库

在 Supabase 的 SQL Editor 中执行 [docs/wallets-schema.sql](docs/wallets-schema.sql)，创建 `wallets` 表。

### 3. 环境变量

复制并编辑 `.env`（不要提交到 Git）：

```bash
# Motia Workbench 登录（可选，不设则无 Basic Auth）
MOTIA_WORKBENCH_AUTH_USER=admin
MOTIA_WORKBENCH_AUTH_PASSWORD=your_password

# 钱包私钥/助记词加密密钥（与 docs 中 WALLET_KEY 对应）
ENCRYPTED_KEY=your_base64_or_hex_key

# Redis（不设则使用 Motia 内置内存 Redis）
REDIS_URL=redis://localhost:6379

# Pharos
PHAROS_CHAIN_ID=688689
PHAROS_RPC_URL=https://your-pharos-rpc
PHAROS_DOMAIN=testnet.pharosnetwork.xyz
PHAROS_API_BASE=https://api.pharosnetwork.xyz
PHAROS_INVITE_CODE=your_invite_code

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Telegram 汇总通知（可选）
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

### 4. 运行

```bash
bun run dev
```

浏览器打开 [http://localhost:3000](http://localhost:3000) 进入 Motia Workbench，可查看流程与日志。

---

## 提供的接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/pharos/checkin` | 手动触发一次签到。Body: `{ "id": "钱包 UUID" }`，UUID 为 Supabase `wallets.id` |
| POST | `/wallet/encrypt` | 加密私钥/助记词。Body: `{ "private_key": "0x...", "mnemonic": "word1 word2 ..." }` 至少传一个；返回 `encrypted_private_key` / `encrypted_mnemonic`（与表内加密列格式一致） |

---

## 部署

- **Docker**：项目根目录有 `Dockerfile` 与 `docker-compose.yml`，通过 `env_file: .env` 注入环境变量。
- **GitHub Actions**：`.github/workflows/deploy.yml` 在 push 到 `main` 或手动触发时，用 **Secrets** 生成 `.env` 并构建镜像；若在仓库 **Variables** 中设 `DEPLOY_VPS=true`，会再执行 deploy-vps job，将代码与 .env 拷贝到 VPS 并执行 `docker compose up -d --build`。VPS 需配置 Secrets：`VPS_HOST`、`VPS_USERNAME`、`VPS_PASSWORD`；可选 Variable：`DEPLOY_PATH`（默认 `~/app`）。

Secrets 与 `.env` 中变量一一对应，参见 workflow 内 “Create .env” 步骤。

---

## 使用建议

1. **钱包录入**：先用 `POST /wallet/encrypt` 得到加密后的私钥（及可选助记词），再写入 Supabase `wallets` 表（`private_key_encrypted`、可选 `mnemonic_encrypted`、`address` 等）。
2. **单钱包测试**：用 `POST /pharos/checkin` 传入一个钱包的 `id`，在 Workbench 或日志中查看全流程与 Telegram 汇总。
3. **生产**：确认 Cron 时间（`schedule.cron.step.ts` 中 `cron` 表达式）和时区，以及 RPC、API 限流与稳定性。

---

## 技术栈与致谢

- [Motia](https://motia.dev) — 事件驱动与步骤化后端
- [Supabase](https://supabase.com) — 钱包表存储
- [ethers](https://docs.ethers.org) — 签名与链上交易
- Pharos 测试网 — 登录、签到、领水、任务验证等接口

---

## 许可证与贡献

本项目采用 **MIT** 许可证。欢迎提 Issue、PR 或文档改进，使用中遇到问题可先查 [Motia 文档](https://motia.dev/docs) 与仓库内 [AGENTS.md](AGENTS.md)。
