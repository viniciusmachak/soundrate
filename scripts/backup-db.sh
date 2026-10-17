#!/usr/bin/env sh
# Dumps the Soundrate Postgres database to a gzip file and keeps the newest N backups.
#
# Usage:   ./scripts/backup-db.sh [backup-dir]
# Env:     BACKUP_KEEP  number of backups to keep (default 14)
# Cron:    0 3 * * * cd ~/sound-rate && ./scripts/backup-db.sh >> backups/backup.log 2>&1
set -eu

cd "$(dirname "$0")/.."

BACKUP_DIR="${1:-backups}"
BACKUP_KEEP="${BACKUP_KEEP:-14}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
FILE="$BACKUP_DIR/soundrate-$TIMESTAMP.sql.gz"

mkdir -p "$BACKUP_DIR"

# Plain SQL (not pg_dump custom format) so it can be restored with psql anywhere.
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-privileges' \
  | gzip > "$FILE.tmp"
mv "$FILE.tmp" "$FILE"

# Fail loudly if the dump is suspiciously small (e.g. the database was unreachable).
if [ "$(wc -c < "$FILE")" -lt 1024 ]; then
  echo "Backup $FILE is smaller than 1 KB; check the database." >&2
  exit 1
fi

# Keep only the newest $BACKUP_KEEP backups.
ls -1t "$BACKUP_DIR"/soundrate-*.sql.gz | tail -n +"$((BACKUP_KEEP + 1))" | xargs -r rm --

echo "$(date -Iseconds) Backup written to $FILE"
