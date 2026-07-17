#!/usr/bin/env bash
# [INPUT]: 仓库根目录 .env.local 或 .env（供 compose 变量展开，避免告警）
# [OUTPUT]: 停止 docker-compose.dev.yml 服务（down --remove-orphans，不 prune）
# [POS]: scripts 本地 Docker 停止入口；不删除用户数据 / 命名卷内容以外的全局资源
# [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE=""
if [[ -f "$ROOT_DIR/.env.local" ]]; then
  ENV_FILE="$ROOT_DIR/.env.local"
elif [[ -f "$ROOT_DIR/.env" ]]; then
  ENV_FILE="$ROOT_DIR/.env"
fi

if [[ -n "$ENV_FILE" ]]; then
  echo "[docker-stop] using env file: $ENV_FILE"
  docker compose --env-file "$ENV_FILE" -f docker-compose.dev.yml down --remove-orphans
else
  echo "[docker-stop] no .env.local/.env found; stopping without --env-file"
  docker compose -f docker-compose.dev.yml down --remove-orphans
fi

echo "[docker-stop] api stopped. (no global prune; volumes retained)"
