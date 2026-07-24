# SuperNote 上线 Checklist

发布冻结收束后的上线核查清单。覆盖 env / build / Docker / 本地脚本 / CORS / RLS / health / 域名 / 日志 / 安全检查。

## 1. 环境变量（env）
- 复制 `.env.example` → `.env.local`（根级，供 docker-compose）/ `app/.env.local` / `chat/.env`（不要提交真实密钥）。
- api 必填：`SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`、`CORS_ORIGINS`（生产 = 真实前端域名）、`CHAT_BASE_URL`、`NODE_ENV=production`。
- chat 必填：`DEEPSEEK_API_KEY`、`ALLOWED_ORIGINS`（生产 = 真实前端域名）、`SUPABASE_URL`、`SUPABASE_PUBLISHABLE_KEY`。
- app 必填：`VITE_SUPABASE_URL`、`VITE_SUPABASE_PUBLISHABLE_KEY`（anon 公钥）、`VITE_API_BASE_URL=https://api.你的域名`。
- **铁律**：绝不在前端放 `service_role`；`service_role` 仅 api 服务端环境变量。

## 2. 构建（build）
- app：`cd app && bun install && bun run build`（产出 `dist/`）。
- api：`cd api && bun install && bun run typecheck`。
- chat：`cd chat && bun install && bun run build`。
- 验收：前端 bundle 无 `service_role` → `grep -R "service_role" app/dist` 应为空。

## 3. Docker（api）
- `docker-compose.dev.yml` 仅 api；生产镜像用 `deploy/docker/api.Dockerfile`。
- healthcheck 指向 `GET /health`。
- 生产部署显式 `NODE_ENV=production`（CORS 才会走严格白名单）。

## 4. 本地脚本（scripts/）
- `scripts/docker-start.sh` / `docker-stop.sh` / `docker-logs.sh`。
- 本地三服务：app `bun run dev`、chat `bun run dev`、api `docker compose up`。

## 5. CORS
- api：非 `production` 用 `*` 通配；`production` 严格 `CORS_ORIGINS` 白名单（含协议与端口）。
- chat：`ALLOWED_ORIGINS` = 生产前端域名。
- 两端 prod 都必须与前端真实来源完全一致，否则浏览器跨域拦截。

## 6. RLS（Supabase）
- `public.feedback` / `public.memos` / chat_* 已 `enable row level security` + owner-only policy。
- api 用 `service_role` 绕过 RLS 写；前端直连仅 anon，受 RLS 约束。
- **执行迁移**：`scripts/sql/round02_feedback.sql`（public.feedback 建表 + memos.category 列 + RLS）通过 Supabase MCP / SQL 编辑器执行。

## 7. 健康检查（health）
- api `GET /health` → `{ code:"ok", message:"OK", data:{ status:"healthy" } }`。
- chat `GET /health` → `{ code:"ok", message:"OK", data:{ status, modelConfigured, defaultModel } }`。
- 容器 / 负载均衡探针挂 `/health`。

## 8. 域名
- 前端域名、api 域名、chat 域名 DNS + HTTPS。
- `VITE_API_BASE_URL` / `CHAT_BASE_URL` 指向生产域名。

## 9. 日志
- api/chat 日志只记 `method/path/status`，**绝不打印 token / key / 完整 Authorization**。
- 监控 401（会话失效）/ 502（分类失败 `CLASSIFY_FAILED`）告警。

## 10. 安全检查
- [ ] 前端 bundle 无 `service_role`（grep 验收）
- [ ] `.env*` 已 gitignore，未提交密钥
- [ ] `api/.env.example` 不含真实 `service_role`（仅为占位）
- [ ] feedback 路由只走 Supabase REST，body 拒绝 `id/user_id/owner_id`
- [ ] classify 路由 owner 校验 + 转发 JWT，不暴露 key
- [ ] 模型 key 缺失 → chat 启动 fail-fast
- [ ] 根 `.env.local` 的 `SUPABASE_URL` 与 `SUPABASE_SERVICE_ROLE_KEY` 为独立两行（无错拼）
