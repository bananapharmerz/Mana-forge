# Mana Forge security checklist

Run through this before a big release, and at least once a month. ✅ = checked and fine, ⚠️ = open (owner action or follow-up), ⬜ = re-check each time.

Last full run: 9 October 2026.

## Authentication
- ✅ Passwords hashed with bcrypt
- ✅ Breached-password check on sign-up
- ✅ Login lockout (8 per account, 30 per IP in 15 min)
- ✅ No account guessing (same reply and timing for unknown emails)
- ✅ Password reset: hashed single-use token, 1 hour, signs out everywhere, sends a notice email
- ✅ Logging out clears the cookie. Pasting a members-only URL afterwards goes to login (tested 9 Oct)
- ⚠️ "Sign out of all devices" button (a copied cookie stays valid up to 14 days)
- ⚠️ Optional 2FA for players (not planned yet)

## Authorization
- ✅ Every write checks the signed-in owner on the server (decks, favourites, watchlist, Premium, guest import)
- ✅ Someone else's deck editor URL → login page. Private decks → 404 for everyone (tested 9 Oct)
- ✅ Premium features check the tier on the server
- ✅ `/api/admin/*` answers 404 without the admin key (tested 9 Oct)

## API security
- ✅ Rate limits on every public action and route
- ✅ Temporary IP bans with appeal codes
- ✅ Live game streams capped per IP. Room codes validated
- ✅ Game seats protected by per-browser secrets
- ⬜ New routes and actions: limit + owner check + input validation added?

## Input
- ✅ Server-side cleaning of every field (`src/lib/validate.ts`)
- ✅ No `$queryRawUnsafe` or `$executeRawUnsafe` anywhere
- ✅ Uploads limited to small PNG/JPEG/WebP files

## Payments
- ✅ Webhook signature, amount and currency checked
- ✅ Prices set on the server
- ✅ Cancel button with a confirmation email
- ✅ Restricted Stripe key with Customer portal: Write (9 Oct)
- ⬜ Test checkout with a 100%-off code after any payment change, then delete the code

## Secrets
- ✅ No secrets in the repository or the client bundle
- ✅ `.env`, the database and the schema can't be downloaded (Police Station, every 30 min)
- ⚠️ Delete the old leaked Gmail app password in Google (morning list)
- ⚠️ Move the server's secrets file into a password manager (morning list)

## Transport and headers
- ✅ HTTPS through Cloudflare, SSL Full (strict)
- ✅ Firewall: 80/443 only from Cloudflare
- ✅ HSTS, nosniff, Referrer-Policy, Permissions-Policy, `frame-ancestors 'none'`
- ✅ Personal pages `private, no-store`, never cached by Cloudflare (tested 9 Oct)
- ⚠️ Add `script-src` to the CSP once AdSense is live

## Accounts of the owner
- ⚠️ 2FA on GitHub, Cloudflare, Hetzner, Coolify, Stripe, Resend and Google
- ⬜ Review who has access to each account

## Dependencies
- ✅ Dependabot on
- ⬜ `npm audit` clean before release
- ✅ Nexus Library audits Nexus twice a day (0 known vulnerabilities on 9 Oct)

## Privacy (GDPR)
- ✅ Privacy policy matches what is collected (contact, analytics, IP bans, guest draft, Resend)
- ✅ Cookieless analytics, DNT and GPC respected, 90-day retention
- ✅ IPs stored only as hashes (bans), deleted 90 days after a ban ends

## Backups and recovery
- ✅ Nightly server backup, 14 copies on the owner's PC
- ⚠️ Rehearse a restore onto a test copy

## AI
- ✅ Mana Forge runs no AI model and sends no player data to one
- ✅ Nexus code changes need approval, a snapshot and automatic rollback

## Status summary (9 October 2026)

| | Count |
|---|---|
| Checks passed | 34 |
| Open: owner action | 5 (2FA everywhere, Gmail app password, password manager, account access review, restore rehearsal) |
| Open: follow-up build | 3 (sign out everywhere, CSP script-src, optional player 2FA) |
| Critical findings | 0 |
