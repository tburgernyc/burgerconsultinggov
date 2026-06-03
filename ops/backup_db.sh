#!/bin/bash
set -euo pipefail
BACKUP_DIR="/backups/db"
STAMP=$(date +%Y%m%d_%H%M%S)
FILE="$BACKUP_DIR/postgres_$STAMP.sql.gz"
mkdir -p "$BACKUP_DIR"
echo "[backup] Dumping at $STAMP..."
docker exec hermes_db pg_dump -U postgres postgres | gzip > "$FILE"
SIZE=$(du -sh "$FILE" | cut -f1)
echo "[backup] Saved $FILE ($SIZE)"
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +14 -delete
echo "[backup] Done. $(ls "$BACKUP_DIR"/*.sql.gz 2>/dev/null | wc -l) backup(s) retained."
