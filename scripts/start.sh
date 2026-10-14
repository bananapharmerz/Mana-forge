#!/bin/sh
# Container start: back up the DB, apply any new migrations, then run the site.
set -e
: "${DATABASE_PATH:=/data/manaforge.db}"
export DATABASE_PATH
export DATABASE_URL="file:$DATABASE_PATH"
mkdir -p "$(dirname "$DATABASE_PATH")"

# --- Save point: snapshot the DB before migrating, keep the last 10 ---
if [ -f "$DATABASE_PATH" ]; then
  BACKUP_DIR="$(dirname "$DATABASE_PATH")/backups"
  mkdir -p "$BACKUP_DIR"
  STAMP="$(date +%Y%m%d-%H%M%S)"
  if command -v sqlite3 >/dev/null 2>&1; then
    sqlite3 "$DATABASE_PATH" ".backup '$BACKUP_DIR/manaforge-$STAMP.db'"
  else
    cp "$DATABASE_PATH" "$BACKUP_DIR/manaforge-$STAMP.db"
    if [ -f "$DATABASE_PATH-wal" ]; then cp "$DATABASE_PATH-wal" "$BACKUP_DIR/manaforge-$STAMP.db-wal"; fi
    if [ -f "$DATABASE_PATH-shm" ]; then cp "$DATABASE_PATH-shm" "$BACKUP_DIR/manaforge-$STAMP.db-shm"; fi
  fi
  ls -1t "$BACKUP_DIR"/manaforge-*.db 2>/dev/null | tail -n +11 | while read -r old; do rm -f "$old"; done
  echo "[start] DB snapshot saved to $BACKUP_DIR/manaforge-$STAMP.db"
fi

npx prisma migrate deploy
exec npx next start -p "${PORT:-3000}" -H 0.0.0.0
