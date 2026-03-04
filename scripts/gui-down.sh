#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ "${1:-}" = "--volumes" ] || [ "${1:-}" = "-v" ]; then
  echo "[gui-down] docker compose down -v"
  docker compose down -v
  exit 0
fi

echo "[gui-down] docker compose down"
docker compose down
