#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo "[gui-up] docker コマンドが見つかりません。"
  exit 1
fi

read_env_value() {
  local key="$1"
  local file=".env"
  if [ ! -f "$file" ]; then
    return 0
  fi

  local line
  line="$(grep -E "^${key}=" "$file" | tail -n 1 || true)"
  if [ -z "$line" ]; then
    return 0
  fi
  printf '%s' "${line#*=}" | tr -d '\r'
}

FRONTEND_PORT="${FRONTEND_HOST_PORT:-$(read_env_value FRONTEND_HOST_PORT)}"
BACKEND_PORT="${BACKEND_HOST_PORT:-$(read_env_value BACKEND_HOST_PORT)}"

FRONTEND_PORT="${FRONTEND_PORT:-15173}"
BACKEND_PORT="${BACKEND_PORT:-18080}"

detect_api_probe_base() {
  local host
  for host in localhost 127.0.0.1 host.docker.internal; do
    if curl -fsS "http://${host}:${BACKEND_PORT}/health" >/dev/null 2>&1; then
      printf '%s' "http://${host}:${BACKEND_PORT}"
      return 0
    fi
  done
  return 1
}

echo "[gui-up] docker compose up -d --build"
docker compose up -d --build

echo "[gui-up] サービス起動待機中..."
ready="false"
for _ in $(seq 1 30); do
  running_services="$(docker compose ps --status running --services 2>/dev/null || true)"
  if echo "$running_services" | grep -qx "backend" && echo "$running_services" | grep -qx "frontend"; then
    ready="true"
    break
  fi
  sleep 1
done

if [ "$ready" != "true" ]; then
  echo "[gui-up] サービスの起動確認に失敗しました。ログを確認してください。"
  docker compose logs --tail=60 backend frontend db
  exit 1
fi

if command -v curl >/dev/null 2>&1; then
  if ! detect_api_probe_base >/dev/null; then
    echo "[gui-up] 注意: ホストから /health へ到達できませんでした（環境差異の可能性があります）。"
  fi
fi

echo
echo "[gui-up] 起動完了"
echo "  GUI: http://localhost:${FRONTEND_PORT}"
echo "  API: http://localhost:${BACKEND_PORT}/health"
echo "  停止: ./scripts/gui-down.sh"
