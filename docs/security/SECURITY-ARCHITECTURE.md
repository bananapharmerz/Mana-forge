# Mana Forge security architecture

How Mana Forge is put together so that the rules in `SECURITY-REQUIREMENTS.md` hold. Where each defence lives in the code, so it can be found, tested and kept.

Last reviewed: 9 October 2026.

## Layers, outside in

```
1. Cloudflare          DNS, TLS, proxy, Bot Fight Mode, caching only for static files
2. Hetzner firewall    80/443 only from Cloudflare's IP ranges; SSH by key
3. Coolify             builds the Docker image from GitHub main, injects env vars, keeps the old container if a build fails
4. src/proxy.ts        every request: IP-ban check (bans.json), shop switch
5. Next.js app         security headers (next.config.ts), server actions and route handlers
6. Server checks       session → owner → tier → input validation → rate limit
7. Data                SQLite through Prisma, on the /data volume, backed up nightly
```

## Frontend

- React escapes all text. User content (deck names, notes) is rendered as text only.
- No secrets in the browser bundle. Only `NEXT_PUBLIC_*` values (ads switch, AdSense client ID, shop switch) reach the client, and none of them is secret.
- The guest deck builder keeps its one draft in `localStorage`. It holds no personal data and is moved into the account on sign-up (`src/lib/guestDeck.ts`, `importGuestDeck`).
- Analytics beacons (`src/components/SiteTracker.tsx` → `/api/a`) send the page, the referrer and timings. No cookies, no IDs.

## Authentication

- Auth.js (NextAuth) with an email and password provider, configured in `src/auth.ts`.
- JWT session cookie: HttpOnly, Secure, SameSite=Lax, 14 days, refreshed daily.
- The JWT carries `sv` (the session version). If it doesn't match `User.sessionVersion`, the session is rejected. That's how a password reset signs out every device.
- Login: lockout via `hit("login:email:…")` and `hit("login:ip:…")`, plus a dummy bcrypt compare for unknown emails (constant time).
- Password reset: `src/app/actions/password.ts`. The token is random, only its SHA-256 is stored, it expires in 1 hour and works once.

## Authorization

- Server actions in `src/app/actions/*.ts` start with `requireUserId()` (or `auth()`) and then load the record and compare `ownerId`.
- Pages: the editor at `src/app/deck-builder/[id]/page.tsx` redirects strangers to login and 404s non-owners. Deck view at `src/app/decks/view/[deckId]/page.tsx` 404s private decks.
- Tier: `deckLimitFor(tier)`, and Premium features re-read `User.tier` from the database on every call.
- Admin: `src/app/api/admin/bans/route.ts` needs the `x-admin-key` header equal to `ADMIN_API_KEY` (SHA-256 then `timingSafeEqual`). Otherwise it answers 404.

## API and actions

- Route handlers: `/api/a` (analytics), `/api/play/*` (game rooms), `/api/webhooks/stripe`, `/api/admin/bans` and `/api/auth/*`.
- Every handler has a rate limit (`src/lib/rateLimit.ts`). Repeated blocks feed IP strikes (`src/lib/bans.ts`). Limits that normal browsing can hit (search, analytics, open-room list) don't count as strikes.
- Live game streams: at most 8 open per IP, 60 new per minute, room codes validated.
- Game actions need the seat secret only that browser holds (`checkSeat` in `src/lib/gameRooms.ts`).

## Payments (Stripe)

- Checkout Session created server-side in `src/app/actions/premium.ts` with the price from `src/lib/tier.ts`. Promotion codes are allowed. Express consent for an immediate start is required (EU withdrawal right).
- Webhook in `src/app/api/webhooks/stripe/route.ts`: signature verified with `STRIPE_WEBHOOK_SECRET`, amount and currency checked, then the subscription is linked to the user.
- Cancel: always reachable at `/cancel`, with a confirmation email (§ 312k BGB).

## Database

- SQLite file at `DATABASE_PATH=/data/manaforge.db` on a Docker volume. Not reachable from outside the container.
- Access only through Prisma, or tagged-template raw SQL (parameterised).
- Migrations live in `prisma/migrations` and run on container start.
- Personal data in tables: `User` (email, password hash, Stripe IDs), `ContactMessage`, `PasswordReset` (hashes only), `IpBan` (IP hashes, and an email only if the abuser was signed in), `Hit` (no personal data).

## Secrets

| Secret | Where | Used for |
|---|---|---|
| `AUTH_SECRET` | Coolify | Signing sessions, hashing analytics and IP-ban IPs |
| `STRIPE_SECRET_KEY` (restricted) / `STRIPE_WEBHOOK_SECRET` | Coolify | Checkout, billing portal, webhook check |
| `RESEND_API_KEY` | Coolify | Transactional email |
| `ADMIN_API_KEY` | Coolify + `nexus/.env` | Nexus admin API |
| SSH key `manaforge_hetzner` | Owner's PC only | Nexus mirror and backups |

None of these are in git. Rotate any that appear in a commit, a screenshot or a chat.

## AI and LLM

- Mana Forge: none. Budget upgrade ideas come from EDHREC play data and Scryfall prices, not a model.
- Nexus: Claude via `ANTHROPIC_API_KEY` for the Supreme Court, Congress, Library research and draft fixes. Draft code changes are limited to `nexus/src`, shown as a diff, approved by the owner, type-checked and rolled back automatically if Nexus doesn't come back healthy.

## Monitoring and logging

- `ErrorLog` table: every server error, with the path and message only. The Repair Yard groups errors by cause and re-tests fixes.
- `SecurityEvent` table: counts of blocked logins, rate limits, bad webhooks and rejected seats per minute. No IPs.
- Police Station (Nexus): an outside inspection every 30 minutes (headers, `.env` not downloadable, the editor needs login, seats, webhook signature).
- White House (Nexus): health of every page every 10 minutes.
- Library (Nexus): `npm audit` for Nexus itself twice a day.

## Deployment

- `git push origin main` → GitHub webhook → Coolify build → new container. If the build fails, the old container keeps serving.
- Build arguments carry only public values (`NEXT_PUBLIC_*`). Secrets are runtime env vars.
- Nightly backup at 03:15 UTC on the server. Nexus pulls a copy each day and keeps 14.
