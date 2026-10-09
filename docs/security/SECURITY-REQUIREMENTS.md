# Mana Forge security requirements

The rules every change to Mana Forge (manaforgehub.com) has to follow. If a change can't meet one of these, it doesn't ship until it can, or the exception is written down here with the reason.

Last reviewed: 9 October 2026.

## Who and what we protect

- **Players:** their email address, password, decks, favourites, watchlists and Premium subscription.
- **Money:** Premium payments through Stripe, plus the shop (switched off for now).
- **The site itself:** staying up, not being used to attack others, and not leaking secrets.
- **The owner's accounts:** Hetzner, Coolify, Cloudflare, GitHub, Stripe, Resend and Google AdSense.

## 1. Accounts and sign-in

- 1.1 Passwords are stored only as bcrypt hashes, never in plain text, never logged.
- 1.2 Password rules: at least 8 characters with a letter and a number, and not containing the email name (`src/lib/passwordRules.ts`).
- 1.3 Sign-up refuses passwords found in known breaches (Have I Been Pwned, k-anonymity range API, `src/lib/pwned.ts`).
- 1.4 Login is limited to 8 failed tries per account and 30 per IP address in 15 minutes.
- 1.5 A wrong email and a wrong password take the same time and give the same message, so nobody can find out who has an account.
- 1.6 Sessions are signed JWT cookies (HttpOnly, Secure, SameSite=Lax) that last at most 14 days.
- 1.7 A password reset uses a single-use token, stored only as a SHA-256 hash, valid for 1 hour. Using it signs the account out everywhere (`User.sessionVersion`) and emails a "password changed" notice.

## 2. Who may do what (authorization)

- 2.1 Every server action and API route that changes data checks **on the server** who is signed in **and** that they own the thing they're changing. Being signed in is never enough.
- 2.2 Private decks are never shown to anyone through `/decks/view/…`. The editor (`/deck-builder/[id]`) only opens for the owner. Everyone else is sent to the login page or gets a 404.
- 2.3 Premium-only features (unlimited decks, budget upgrades, price alerts) check the tier on the server, not in the browser.
- 2.4 Admin access exists only through Nexus. `/api/admin/*` needs `ADMIN_API_KEY` (32+ characters, compared in constant time) and answers 404 to everyone else.

## 3. Input

- 3.1 Nothing from the browser is trusted. Every value is trimmed, size-capped and type-checked on the server (`src/lib/validate.ts`).
- 3.2 Images are accepted only from Scryfall or as small uploaded PNG/JPEG/WebP files under 2 MB.
- 3.3 The database is reached only through Prisma or tagged-template `$executeRaw`/`$queryRaw`, so every value is a parameter. `$queryRawUnsafe` and `$executeRawUnsafe` are not allowed.
- 3.4 Prices and amounts always come from the server. The browser never decides what something costs.

## 4. Abuse and rate limits

- 4.1 Every public action has a limit: sign-up, login, password reset, contact, checkout, reports, searches, game rooms, game actions and live game connections (at most 8 open per IP address).
- 4.2 Limits are scoped to the user where there is one and to the IP address where there isn't. Behind Cloudflare the IP comes from `cf-connecting-ip` (only when `TRUST_CLOUDFLARE=1`).
- 4.3 Repeated abuse leads to a temporary IP ban (10 blocked requests in an hour: 24 hours, then 7 days for repeat offenders). Only a hash of the IP address is stored. Banned visitors get an appeal code (`src/lib/bans.ts`).

## 5. Payments

- 5.1 Card details never touch our server. Checkout runs on Stripe.
- 5.2 Stripe webhooks are accepted only with a valid Stripe signature. The amount and currency must match the order, and the same event can't be replayed.
- 5.3 Stripe keys are restricted keys with only the permissions they need.

## 6. Secrets

- 6.1 Secrets live only in Coolify's environment variables (server) and in `.env` files that git ignores (local). They are never committed, logged, emailed or shown on screen.
- 6.2 `.env`, the database and the Prisma schema can't be downloaded from the site (the Police Station checks this every 30 minutes).
- 6.3 A leaked secret is rotated at once, not just deleted from git.

## 7. Transport and browser

- 7.1 HTTPS only, through Cloudflare (SSL Full strict). The Hetzner firewall lets ports 80 and 443 in only from Cloudflare's IP ranges.
- 7.2 Security headers on every response: HSTS, X-Content-Type-Options nosniff, a Referrer-Policy, a Permissions-Policy, and a CSP with `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'` and a locked-down `form-action`.
- 7.3 Pages with personal data are `Cache-Control: private, no-store`, so a shared computer or Cloudflare never serves them to someone else.

## 8. Privacy

- 8.1 Collect only what a feature needs. Analytics are cookieless: a daily-rotating hash, Do Not Track and Global Privacy Control respected, hits deleted after 90 days.
- 8.2 Logs and the error log never contain passwords, tokens, email bodies or anything a visitor typed.
- 8.3 Retention periods are listed in the privacy policy and enforced in code.

## 9. Availability and recovery

- 9.1 The database is backed up every night on the server. Nexus copies the backups to the owner's PC and keeps 14 days.
- 9.2 Every server error is recorded (without personal data). The Repair Yard turns each cause into a work order and re-tests it after a fix.

## 10. Dependencies and code changes

- 10.1 Dependabot watches for vulnerable packages. `npm audit` has to be clean before a release.
- 10.2 Every change is type-checked and linted before it is pushed. Pushes to `main` deploy automatically, so `main` must always build.
- 10.3 AI-written code gets the same review as any other code: these requirements apply to it in full.

## 11. AI

- 11.1 Mana Forge itself runs no AI model and sends no player data to one.
- 11.2 Nexus (the private admin hub) uses Claude for research and drafting fixes. Code it writes is applied only after the owner approves it, inside a snapshot that rolls back by itself on failure. Web content it reads is treated as data, never as instructions.
