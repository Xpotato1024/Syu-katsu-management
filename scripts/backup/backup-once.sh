#!/bin/sh
set -eu

DB_HOST="${DB_HOST:-db}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-syukatsu}"
DB_USER="${DB_USER:-syukatsu_user}"
DB_PASSWORD="${DB_PASSWORD:-syukatsu_password}"
BACKUP_FILE_PREFIX="${BACKUP_FILE_PREFIX:-syukatsu}"

timestamp="$(date +%Y%m%d_%H%M%S)"
output="/backups/${BACKUP_FILE_PREFIX}_${timestamp}.sql.gz"

mkdir -p /backups
export PGPASSWORD="$DB_PASSWORD"
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" | gzip -c > "$output"
echo "backup created: $output"
