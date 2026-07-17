#!/usr/bin/env bash
# [INPUT]: 可选服务名（默认 api）；仓库根目录 .env.local 或 .env
# [OUTPUT]: 跟随 docker compose 日志；非 api 服务名时提示本机分工并 exit 1
# [POS]: scripts 本地 Docker 日志入口
# [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

SERVICE="${1:-api}"

if [[ "${SERVICE}" != "api" ]]; then
  # Avoid embedding $var next to CJK quotes inside heredoc under set -u
  echo "[docker-logs] 服务 '${SERVICE}' 不在 docker-compose.dev.yml 中。" >&2
  echo "app 用本机 Bun/Vite 启动，chat 暂未启动" >&2
  echo "可用: ./scripts/docker-logs.sh api" >&2
  exit 1
fi

ENV_FILE=""
if [[ -f "$ROOT_DIR/.env.local" ]]; then
  ENV_FILE="$ROOT_DIR/.env.local"
elif [[ -f "$ROOT_DIR/.env" ]]; then
  ENV_FILE="$ROOT_DIR/.env"
fi

if [[ -n "$ENV_FILE" ]]; then
  exec docker compose --env-file "$ENV_FILE" -f docker-compose.dev.yml logs -f api
else
  exec docker compose -f docker-compose.dev.yml logs -f api
fi
