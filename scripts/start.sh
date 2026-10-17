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

# --- Migrations ---
# SQLite allows only one writer. During a zero-downtime (rolling) deploy the new container shares
# the DB file with the still-running old one, and `prisma migrate deploy` takes a write lock even
# when there is nothing to apply — so it blocks on the old container and the deploy fails
# ("database is locked" / "New container is unhealthy"). When there are no pending migrations (the
# common case) we skip it entirely: no write lock, so a rolling deploy just works. Only a real
# schema change needs the exclusive lock, and for that we retry a few times to ride out a brief
# lock (e.g. the nightly backup) before giving up.
if npx prisma migrate status >/dev/null 2>&1; then
  echo "[start] schema up to date — skipping migrate deploy"
else
  echo "[start] pending migrations — applying (needs an exclusive DB lock)"
  # During a rolling (zero-downtime) deploy the old container keeps serving traffic and holds the
  # SQLite file, so the exclusive lock an ALTER needs is only free in the gaps between the old
  # container's writes. Retry patiently over a wide window — sized to fit inside the Docker
  # HEALTHCHECK start-period alongside the snapshot above and `next start` below — so a migration
  # can slip into one of those gaps instead of needing a manual redeploy. If it still can't (steady
  # write traffic the whole time), a non-rolling deploy (stop the old container first) always works.
  n=0
  max=15
  until npx prisma migrate deploy; do
    n=$((n + 1))
    if [ "$n" -ge "$max" ]; then
      echo "[start] migrate deploy still failing after $n attempts — aborting." >&2
      echo "[start] The old container is probably still holding the DB; redeploy without" >&2
      echo "[start] zero-downtime (stop the old container first) to apply this migration." >&2
      exit 1
    fi
    echo "[start] migrate deploy failed (attempt $n/$max), likely a DB lock — retrying in 6s" >&2
    sleep 6
  done
  echo "[start] migrations applied"
fi

exec npx next start -p "${PORT:-3000}" -H 0.0.0.0
