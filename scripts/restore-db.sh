#!/usr/bin/env sh
# Restores a backup made by backup-db.sh, replacing the current database contents.
#
# Usage: ./scripts/restore-db.sh backups/soundrate-YYYYMMDD-HHMMSS.sql.gz
set -eu

cd "$(dirname "$0")/.."

FILE="${1:?Usage: $0 <backup-file.sql.gz>}"
[ -f "$FILE" ] || { echo "File not found: $FILE" >&2; exit 1; }

printf 'This replaces ALL data in the Soundrate database with %s. Type "restore" to continue: ' "$FILE"
read -r answer
[ "$answer" = "restore" ] || { echo "Cancelled."; exit 1; }

# Stop the API and Umami (when running) so nothing writes during the restore.
docker compose stop backend
docker compose stop umami 2>/dev/null || true

docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -c "DROP SCHEMA IF EXISTS umami CASCADE; DROP SCHEMA public CASCADE; CREATE SCHEMA public;"'
gunzip -c "$FILE" | docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -q'

docker compose start backend
docker compose start umami 2>/dev/null || true
echo "Restored $FILE."
