#!/bin/bash
# Daily PostgreSQL backup — keeps 14 days of dumps.
set -euo pipefail

BACKUP_DIR="/home/t_burgernyc/backups/db"
STAMP=$(date +%Y%m%d_%H%M%S)
FILE="$BACKUP_DIR/postgres_$STAMP.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[backup] Dumping database at $STAMP..."
docker exec hermes_db pg_dump -U postgres postgres | gzip > "$FILE"

SIZE=$(du -sh "$FILE" | cut -f1)
echo "[backup] Saved $FILE ($SIZE)"

# Prune backups older than 14 days
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +14 -delete
REMAINING=$(ls "$BACKUP_DIR" | wc -l)
echo "[backup] $REMAINING backup(s) retained."
