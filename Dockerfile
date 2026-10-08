# Mana Forge — production image (built by Coolify from GitHub).
FROM node:25-bookworm-slim

# Build tools for better-sqlite3 if no prebuilt binary matches, and OpenSSL for Prisma.
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ ca-certificates openssl \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json .npmrc ./
RUN npm ci

COPY . .

# Public settings are baked into the browser code at build time (set them as Build Variables).
ARG NEXT_PUBLIC_SITE_NAME="Mana Forge"
ARG NEXT_PUBLIC_SITE_URL="https://manaforgehub.com"
ARG NEXT_PUBLIC_SHOP_ENABLED="0"
ENV NEXT_PUBLIC_SITE_NAME=$NEXT_PUBLIC_SITE_NAME \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_SHOP_ENABLED=$NEXT_PUBLIC_SHOP_ENABLED

# Build against a throwaway database with the real schema (some pages read it while building).
RUN DATABASE_PATH=/tmp/build.db DATABASE_URL=file:/tmp/build.db AUTH_SECRET=build-only \
    sh -c "npx prisma generate && npx prisma migrate deploy && npm run build" \
 && rm -f /tmp/build.db*

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATABASE_PATH=/data/manaforge.db

# The live database lives on a persistent volume mounted at /data.
VOLUME ["/data"]
EXPOSE 3000
CMD ["sh", "./scripts/start.sh"]
