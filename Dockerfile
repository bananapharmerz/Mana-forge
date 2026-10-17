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
ARG NEXT_PUBLIC_ADS_ENABLED="0"
ARG NEXT_PUBLIC_ADSENSE_SLOT_BANNER=""
ARG NEXT_PUBLIC_ADSENSE_SLOT_SQUARE=""
ENV NEXT_PUBLIC_SITE_NAME=$NEXT_PUBLIC_SITE_NAME \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_SHOP_ENABLED=$NEXT_PUBLIC_SHOP_ENABLED \
    NEXT_PUBLIC_ADS_ENABLED=$NEXT_PUBLIC_ADS_ENABLED \
    NEXT_PUBLIC_ADSENSE_SLOT_BANNER=$NEXT_PUBLIC_ADSENSE_SLOT_BANNER \
    NEXT_PUBLIC_ADSENSE_SLOT_SQUARE=$NEXT_PUBLIC_ADSENSE_SLOT_SQUARE

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

# Coolify waits for this before sending traffic to a new container, so a broken deploy keeps the
# old one running. Uses node's own fetch because the slim image has no wget or curl. The long
# start period covers the DB snapshot and the patient migrate-deploy retry window in start.sh (a
# schema change during a rolling deploy waits for the old container's write lock to free up).
HEALTHCHECK --interval=30s --timeout=5s --start-period=180s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health',{signal:AbortSignal.timeout(4000)}).then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"

CMD ["sh", "./scripts/start.sh"]
