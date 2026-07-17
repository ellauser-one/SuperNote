#!/usr/bin/env bash
# [INPUT]: 仓库根目录 .env.local 或 .env（含 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY）
# [OUTPUT]: 启动 docker-compose.dev.yml 中的 api 服务（本机 app/chat 不进容器）
# [POS]: scripts 本地 Docker 启动入口；端口 api=20001，app 本机 20000
# [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE=""
if [[ -f "$ROOT_DIR/.env.local" ]]; then
  ENV_FILE="$ROOT_DIR/.env.local"
elif [[ -f "$ROOT_DIR/.env" ]]; then
  ENV_FILE="$ROOT_DIR/.env"
else
  cat >&2 <<'EOF'
[docker-start] 未找到环境文件。

请先准备密钥文件：
  cp .env.example .env.local

并填写至少：
  SUPABASE_URL=https://your-project.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

然后重新执行：
  ./scripts/docker-start.sh
EOF
  exit 1
fi

echo "[docker-start] using env file: $ENV_FILE"
echo "[docker-start] starting api (Docker) on port ${API_PORT:-20001}…"
echo "[docker-start] app stays on host Bun/Vite :20000; chat not started."

exec docker compose --env-file "$ENV_FILE" -f docker-compose.dev.yml up --build api
