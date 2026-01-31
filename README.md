# motia-bootcamp

This is a **Motia** project bootstrapped with the Motia CLI.

Motia lets you build APIs, background jobs, workflows, and event-driven systems in a single unified backend.

## Quick Start

```bash
# Start the development server
npm run dev
# or
yarn dev
# or
pnpm dev
```

This starts the Motia runtime and **Workbench**. Workbench is a tool for visualizing and debugging your workflows. By default, it's available at [`http://localhost:3000`](http://localhost:3000).

You can start editing the project by making changes to `src/petstore/api` as well as produce your own `.step.ts`, `.step.js`, or `_step.py` files within the `src/` directory.

Motia auto-discovers all step files and executes them as defined in each step's configuration. Learn more about the power and simplicity of steps in the [Step Docs](https://motia.dev/docs/concepts/steps).

## Project Config

The `motia.config.ts` file is the central configuration for your Motia application. Here you can customize Express, configure Redis, add security middleware, handle file uploads, set up stream authentication, and more.

## 环境变量与部署

环境变量不要提交到 GitHub（`.env`、`.env.local` 已在 `.gitignore` 中）。敏感值用 **GitHub Secrets** 存，由 CI 在部署时注入。

### 1. 在仓库里配置 GitHub Secrets

仓库 → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**，按 `.env.example` 里用到的变量逐个添加，例如：

| Secret 名称 | 说明 |
|-------------|------|
| `MOTIA_WORKBENCH_AUTH_USER` | Workbench 登录用户名 |
| `MOTIA_WORKBENCH_AUTH_PASSWORD` | Workbench 登录密码 |
| `SUPABASE_URL` | Supabase 项目 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `PHAROS_API_BASE` / `PHAROS_APL_BASE` | Pharos API 地址 |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | Telegram 通知（如需要） |
| … | 其他见 `.env.example` |

### 2. CI 里用 Secrets 注入（GitHub Actions）

在 workflow 里用 Secrets 生成 `.env` 再交给 Docker，例如：

```yaml
env:
  MOTIA_WORKBENCH_AUTH_USER: ${{ secrets.MOTIA_WORKBENCH_AUTH_USER }}
  MOTIA_WORKBENCH_AUTH_PASSWORD: ${{ secrets.MOTIA_WORKBENCH_AUTH_PASSWORD }}
  SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
  SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
  # ... 其他变量

run: |
  echo "MOTIA_WORKBENCH_AUTH_USER=$MOTIA_WORKBENCH_AUTH_USER" >> .env
  echo "MOTIA_WORKBENCH_AUTH_PASSWORD=$MOTIA_WORKBENCH_AUTH_PASSWORD" >> .env
  # ... 其余变量
  docker compose up -d --build
```

或部署到 VPS：在 CI 里用 Secrets 生成 `.env`，SCP 到服务器后执行 `docker compose up`。仓库里已有一份示例 workflow：**`.github/workflows/deploy.yml`**。需在 **Secrets** 里配置 `MOTIA_WORKBENCH_*`、`SUPABASE_*`、`PHAROS_*` 等；启用 deploy-vps 时还需 Secrets：`VPS_HOST`、`VPS_USERNAME`、`VPS_PASSWORD`；在 **Variables** 里设 `DEPLOY_VPS=true`（可选 `DEPLOY_PATH`，默认 `~/app`）。

### 3. 本地 / 自建 VPS 不用 CI 时

- **本地**：复制 `.env.example` 为 `.env` 或 `.env.local`，填好本地用的值（不提交）。
- **VPS 手动部署**：在服务器上创建 `.env`（或从本机 SCP 上去），再 `docker compose up -d --build` 或 `docker run --env-file .env ...`。

## Learn More

- [Docs](https://motia.dev/docs) - Complete guides and API reference
- [Quick Start Tutorial](https://motia.dev/docs/getting-started/quick-start) - Detailed getting started tutorial
- [Core Concepts](https://motia.dev/docs/concepts/overview) - Learn about Steps and Motia's architecture
- [Discord Community](https://discord.gg/motia) - Get help and connect with other developers