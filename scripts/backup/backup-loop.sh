#!/bin/sh
set -eu

BACKUP_INTERVAL_SECONDS="${BACKUP_INTERVAL_SECONDS:-86400}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
BACKUP_FILE_PREFIX="${BACKUP_FILE_PREFIX:-syukatsu}"

if [ "$BACKUP_INTERVAL_SECONDS" -lt 1 ]; then
  echo "BACKUP_INTERVAL_SECONDS must be >= 1" >&2
  exit 2
fi

while true; do
  /bin/sh /scripts/backup/backup-once.sh

  if [ "$BACKUP_RETENTION_DAYS" -ge 0 ]; then
    find /backups -type f -name "${BACKUP_FILE_PREFIX}_*.sql.gz" -mtime +"$BACKUP_RETENTION_DAYS" -delete
  fi

  sleep "$BACKUP_INTERVAL_SECONDS"
done
