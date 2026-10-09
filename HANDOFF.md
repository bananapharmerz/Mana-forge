# Mana Forge — handoff notes

_Last updated 8 Oct 2026. Read this first when picking the project back up (person or AI)._

## What it is
A Magic: The Gathering site: deck builder and public decks, commander browser, online play rooms,
card price tracker, a small store (sleeves, deck boxes…) and printed proxy orders, plus Premium.
Next.js 16.3.8 (App Router) · Prisma 7 on SQLite (`dev.db`) · Auth.js (next-auth 5 beta, email +
password) · Stripe Checkout. Runs locally with `npm run dev`. Nexus (`../nexus`) is the private
admin hub that reads and edits this site's database.

## Goals
- Launch publicly as a general MTG hub. Brand is swappable: `NEXT_PUBLIC_SITE_NAME` /
  `NEXT_PUBLIC_SITE_URL` in `.env` (tagline "Magic: The Gathering decks, tools & gear").
- Safe enough to put on the open internet before launch (done in the security pass below).

## Key decisions
- SQLite + one server is fine for launch; rate limits and play rooms are in memory
  (`src/lib/rateLimit.ts`, `src/lib/gameRooms.ts`), so they reset on restart. Moving to several
  servers would need Redis or similar.
- Public pages never show emails — only display names ("Anonymous player" if none).
- Everything the browser sends is cleaned in `src/lib/validate.ts` (card data, Scryfall-only images,
  small PNG/JPEG/WebP/GIF uploads, list caps). New features should reuse it.
- Only essential cookies/storage, no analytics → no cookie banner.
- Legal pages are templates, not legal advice.

## Security pass (7 Oct 2026) — what changed
- Login: 8 tries per email / 30 per IP per 15 min, constant-time check, 14-day sessions, no open
  redirect after login. Signup: 5 per hour per IP, stronger password rules, bcrypt cost 12.
- Private decks can't leak via favourites; owner emails removed from public decks; emails masked
  on order success pages.
- Play rooms: each seat has a secret, so nobody can act as another player; room count capped,
  idle rooms cleared after 6 h.
- Stripe webhook: only marks paid orders that are really paid, amount + currency must match,
  replay-safe.
- Proxy checkout: validated cards, quantities and shipping; custom art requires ticking
  "I own the rights" (links to `/legal/copyright`).
- Security headers + small CSP in `next.config.ts`; `X-Powered-By` removed; JSON-LD escaped.
- Friendly error pages: `error.tsx`, `global-error.tsx`, `not-found.tsx`.
- Next.js upgraded 16.3.1 → 16.3.8 (critical fixes, including RCE on Windows-hosted servers);
  sharp and other packages patched with `npm audit fix`.
- Legal pages: `/legal/terms`, `/legal/privacy`, `/legal/copyright`, `/legal/impressum`, linked in
  the footer and on signup.
- Report button on public decks → `DeckReport` table → Nexus inbox (Safety tab: make private /
  dismiss).
- Server errors → `ErrorLog` table via `src/instrumentation.ts` / `src/lib/errorLog.ts` (no personal
  data, emails masked, 30-day retention).
- Daily database backups into `backups/` by Nexus's Archivist bot (keeps 14).
- `.gitignore` now excludes `dev.db*`, `*.bak`, `backups/`, `*.log`.

## Launch plan (decided 7 Oct 2026)
- Launch with deck building, public decks, play and **Premium**; store + proxies come later.
- Shop switch: `NEXT_PUBLIC_SHOP_ENABLED=0|1` in `.env` (`src/lib/features.ts`, `src/proxy.ts`).
  Off = no store/proxy links, their pages show `/coming-soon`, checkouts refuse orders.
- Premium checkout requires the "start now / withdrawal right ends" checkbox (consent time saved in
  Stripe metadata). Cancelling (`/cancel`, linked in the footer) stops renewal; members keep
  Premium until the paid period ends. Signed-out requests go to Nexus → Safety for the admin.
- Still needed for § 312k compliance: an emailed cancellation confirmation (needs an email service).

## Domain and business (8 Oct 2026)
- Domain chosen: **manaforgehub.com** (manaforge.com/.net/.dev/.app/.io/.de and playmanaforge.com
  are taken). At deploy set `NEXT_PUBLIC_SITE_URL` and `APP_URL` to `https://manaforgehub.com`.
- Do a trademark search for "Mana Forge" (DPMA/EUIPO, USPTO) before using it as the official name.
- Gewerbeanmeldung (Heidelberg) prepared; after it, the Finanzamt questionnaire in ELSTER
  (Kleinunternehmerregelung). Impressum needs the owner's name and postal address.
- Security additions: breached-password check at signup (`src/lib/pwned.ts`, HIBP k-anonymity),
  `SecurityEvent` counts (no personal data) read by Nexus's Police Station.

## Current state
- Migration `20261007150000_reports_and_errors` is applied (`npx prisma migrate status` = up to date).
- Typecheck clean (`node node_modules/typescript/bin/tsc --noEmit -p .`).
- Known leftover audit warnings are in the Prisma CLI only (mysql2 / deepmerge-ts, not used at
  runtime with SQLite); npm's suggested "fix" downgrades Prisma, so it was left alone.
- A DB copy from before this pass: `dev.db.before-security.bak`.

## Next steps
1. Fill in `.env`: `LEGAL_OWNER`, `LEGAL_ADDRESS`, `LEGAL_EMAIL`, `LEGAL_COUNTRY` (legal pages show
   [placeholders] until then). Have the legal text checked for your country.
2. Proxies + Stripe: Stripe can treat replica/counterfeit-looking goods as a restricted business.
   Confirm with Stripe (or a lawyer) before taking real proxy payments; keep proxies clearly
   marked as not genuine.
3. Password reset needs email sending (e.g. Resend/Postmark) — not built yet.
4. Hosting for launch (Coolify suggested): HTTPS, `NEXT_PUBLIC_SITE_URL`, `AUTH_SECRET`, Stripe live
   keys + webhook secret, and copy backups off the server.
5. Social media last.

## 8–9 Oct (late)
- Email via Resend (`src/lib/email.ts`): password reset (`/forgot-password`, `/reset-password`, one-time token hashed in `PasswordReset`, 1h, bumps `User.sessionVersion` → all sessions signed out), welcome email, contact-form alert to LEGAL_EMAIL. Needs RESEND_API_KEY (runtime) — no-op without it.
- Ads behind `NEXT_PUBLIC_ADS_ENABLED` (+ `NEXT_PUBLIC_ADSENSE_SLOT_BANNER/SQUARE`, build variables). AdSlot loads AdSense only when on, never for Premium; privacy text switches automatically.
- Perf: EDHREC waits capped (feed 1.2s, credits 0.7–1s, commander deck file 1.5s) with in-flight dedupe; hourly commander rotation for the first feed page; Scryfall batches in parallel. /decks ~0.35s warm, commander pages ~2s cold / 0.4s warm.
- Deploys are triggered via Coolify's queue (GitHub webhook still points at the old :8000 address).

## 2026-10-09 morning
- Premium: €3.99/month or €29/year (src/lib/tier.ts PREMIUM_PLANS), promotion codes allowed at checkout. Owner tested with a 100% code: works end to end.
- Guest deck builder: /deck-builder works signed out; draft in localStorage (src/lib/guestDeck.ts), /deck-builder/guest edits it, GuestSaveBanner moves it into the account (importGuestDeck).
- Premium perks: price alert emails (src/lib/priceAlerts.ts, runs after each hourly price refresh; User.priceAlerts toggle on /premium), budget upgrades (src/app/actions/upgrades.ts + BudgetUpgradesPanel), SupporterBadge on public decks.
- Play streams capped at 8 open per IP.
- IP bans: src/lib/bans.ts (10 rate-limit strikes/hour → 24h, repeat → 7d), hashed IP only, /data/bans.json read by src/proxy.ts, /banned page with appeal code, email when signed in. Admin API /api/admin/bans needs ADMIN_API_KEY (32+ chars), 404 otherwise. Nexus Police Station lists bans and lifts them with the same key in nexus/.env.
