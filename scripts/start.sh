#!/bin/sh
# Container start: apply any new database migrations, then run the site.
set -e
: "${DATABASE_PATH:=/data/manaforge.db}"
export DATABASE_PATH
export DATABASE_URL="file:$DATABASE_PATH"
mkdir -p "$(dirname "$DATABASE_PATH")"
npx prisma migrate deploy
exec npx next start -p "${PORT:-3000}" -H 0.0.0.0
