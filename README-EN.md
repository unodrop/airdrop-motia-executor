# Pharos Airdrop Executor

A [Motia](https://motia.dev)-based Pharos check-in and task execution system with multi-wallet support, scheduled check-ins, transaction sending, task verification, and Telegram notifications. Open source and self-hostable, suitable for Pharos testnet airdrop automation.

---

## Features

- **Multi-wallet management**: Wallets stored in Supabase; private keys encrypted (AES-256-GCM); supports encrypting mnemonic/private key before insert
- **Pharos flow**: Login → Sign-in → Fetch points → Claim faucet (when X is bound) → Check balance → Send tx → Wait for confirmation → Verify task → Re-fetch points
- **Step-level resilience**: Sign-in / claim / profile failures do not block later steps; failure reasons logged via API `msg`
- **Scheduled and manual**: Cron runs daily for all wallets; HTTP endpoint to trigger a single wallet manually
- **Telegram summary**: One combined message after the full flow (login, sign-in, points, claim, tx count, verify result)
- **Workbench**: Motia’s built-in UI and logs for debugging and flow inspection

---

## Documentation and structure

| Path | Description |
|------|-------------|
| [docs/wallets-schema.sql](docs/wallets-schema.sql) | Wallet table schema (PostgreSQL/Supabase), including encrypted columns and indexes |
| [.github/workflows/deploy.yml](.github/workflows/deploy.yml) | CI: build .env from Secrets, build image, optional VPS deploy |
| [AGENTS.md](AGENTS.md) | Motia project overview and rule index for AI assistants |
| [.cursor/rules/](.cursor/rules/) | Motia step, API, Event, Cron conventions (optional) |

**Main code layout:**

```
src/
├── api/                         # HTTP endpoints
│   └── wallet-encrypt.step.ts   # POST /wallet/encrypt – encrypt private key / mnemonic
├── modules/pharos/              # Pharos flow
│   ├── checkin.step.ts          # Event handler: login, sign-in, claim, send tx, verify, notify
│   ├── schedule.cron.step.ts   # Daily cron trigger
│   └── trigger-checkin.step.ts # POST /pharos/checkin – manual trigger
├── repositories/
│   └── wallet.repository.ts
├── services/
│   ├── pharos.client.ts         # Pharos API (login, signIn, profile, claim, verifyTask)
│   ├── notification.ts         # Telegram summary
│   └── ethereum.ts
└── utils/                       # HTTP, ethers, crypto, UA, Telegram
```

---

## Quick start

### Requirements

- **Node.js** 18+
- **Redis** (Motia event queue; in-memory mode supported locally)
- **Supabase** project for the wallet table
- **Pharos** config: RPC, API base, domain, etc. (see env vars below)

### 1. Clone and install

```bash
git clone https://github.com/unodrop/airdrop-motia-executor.git
cd airdrop-motia-executor
bun install
```

### 2. Database

Run [docs/wallets-schema.sql](docs/wallets-schema.sql) in Supabase SQL Editor to create the `wallets` table.

### 3. Environment variables

Copy and edit `.env` (do not commit):

```bash
# Motia Workbench auth (optional; omit for no Basic Auth)
MOTIA_WORKBENCH_AUTH_USER=admin
MOTIA_WORKBENCH_AUTH_PASSWORD=your_password

# Key for encrypting private keys / mnemonics (matches WALLET_KEY in docs)
ENCRYPTED_KEY=your_base64_or_hex_key

# Redis (omit to use Motia in-memory Redis)
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

# Telegram summary (optional)
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

### 4. Run

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) for Motia Workbench to inspect flows and logs.

---

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/pharos/checkin` | Trigger one check-in manually. Body: `{ "id": "wallet-uuid" }` (Supabase `wallets.id`) |
| POST | `/wallet/encrypt` | Encrypt private key and/or mnemonic. Body: `{ "private_key": "0x...", "mnemonic": "word1 word2 ..." }` (at least one); returns `encrypted_private_key` / `encrypted_mnemonic` in the same format as DB columns |

---

## Deployment

- **Docker**: Use the repo’s `Dockerfile` and `docker-compose.yml`; env is loaded via `env_file: .env`.
- **GitHub Actions**: `.github/workflows/deploy.yml` runs on push to `main` or manual trigger: it builds `.env` from **Secrets** and builds the image. If **Variables** has `DEPLOY_VPS=true`, the deploy-vps job copies code and .env to the VPS and runs `docker compose up -d --build`. Required Secrets for VPS: `VPS_HOST`, `VPS_USERNAME`, `VPS_PASSWORD`; optional Variable: `DEPLOY_PATH` (default `~/app`).

Secrets map to the same names as in `.env`; see the “Create .env” step in the workflow.

---

## Usage tips

1. **Adding wallets**: Call `POST /wallet/encrypt` to get encrypted private key (and optionally mnemonic), then insert into Supabase `wallets` (`private_key_encrypted`, optional `mnemonic_encrypted`, `address`, etc.).
2. **Testing one wallet**: Use `POST /pharos/checkin` with that wallet’s `id`; check Workbench or logs for the full flow and Telegram summary.
3. **Production**: Set the cron expression and timezone in `schedule.cron.step.ts`, and consider RPC/API rate limits and stability.

---

## Stack and credits

- [Motia](https://motia.dev) — Event-driven, step-based backend
- [Supabase](https://supabase.com) — Wallet table storage
- [ethers](https://docs.ethers.org) — Signing and on-chain transactions
- Pharos testnet — Login, sign-in, faucet, task verify APIs

---

## License and contributing

This project is **MIT** licensed. Issues, PRs, and doc improvements are welcome. For help, see [Motia docs](https://motia.dev/docs) and the repo’s [AGENTS.md](AGENTS.md).
