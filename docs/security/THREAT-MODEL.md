# Mana Forge threat model

What could go wrong, how likely and how bad it is, and what stops it. Re-check this whenever a feature that handles accounts, money, uploads or other people's data is added.

Last reviewed: 9 October 2026.

## The system at a glance

```
Player's browser ──HTTPS──▶ Cloudflare (proxy, WAF, bot fight) ──▶ Hetzner server (firewall: Cloudflare IPs only)
                                                                     └─ Coolify ─▶ Mana Forge container (Next.js)
                                                                                   ├─ SQLite on a volume (/data)
                                                                                   ├─ Stripe (payments, webhooks in)
                                                                                   ├─ Resend (emails out)
                                                                                   ├─ Scryfall, EDHREC (card data in)
                                                                                   └─ Google AdSense (off for now)
Owner's PC: Nexus ──SSH (key)──▶ server: read-only database copies, deploy status
            Nexus ──HTTPS + ADMIN_API_KEY──▶ /api/admin (list and lift IP bans)
```

## Assets

| Asset | Where it lives | Why it matters |
|---|---|---|
| Player accounts (email, password hash) | SQLite `User` | Takeover, spam, credential stuffing elsewhere |
| Decks, favourites, watchlists | SQLite | Players' work. Private decks must stay private |
| Premium status and Stripe IDs | SQLite + Stripe | Paid features, refunds, chargebacks |
| Secrets (AUTH_SECRET, Stripe, Resend, admin key) | Coolify env, local `.env` | Full compromise if leaked |
| Server and owner accounts | Hetzner, Coolify, Cloudflare, GitHub | Total control of the site |
| Backups | Server + owner's PC | They contain the whole database |

## Trust boundaries

1. **Browser to site:** everything a browser sends is untrusted.
2. **Cloudflare to server:** only Cloudflare may connect (firewall). The visitor IP is taken from `cf-connecting-ip` only when `TRUST_CLOUDFLARE=1`.
3. **Stripe to webhook:** trusted only with a valid signature.
4. **Third-party data (Scryfall, EDHREC):** treated as data. Images are rendered, never executed.
5. **Nexus to server:** an SSH key plus the admin API key, from the owner's PC only.

## Threats

Risk = how likely × how bad. **H** = high, **M** = medium, **L** = low.

| # | Threat | How it would happen | Risk | What stops it | Left over |
|---|---|---|---|---|---|
| T1 | Account takeover by guessing | Credential stuffing, brute force | M | bcrypt, lockouts (8/account, 30/IP), breached-password check, IP bans | Users have no 2FA |
| T2 | Reading or editing someone else's deck (IDOR) | Change the deck ID in a URL or action | M | Owner check on every read and write; private decks 404 | — |
| T3 | Session theft | Stolen cookie (malware, shared PC) | L | HttpOnly + Secure cookie, 14-day limit, no-store pages, sign-out clears the cookie, a password reset signs out everywhere | A copied cookie stays valid until it expires or the password is reset. There is no "sign out everywhere" button yet |
| T4 | Payment fraud | Fake webhook, changed amount, replay | M | Stripe signature, amount and currency match, idempotency | — |
| T5 | Free Premium | Calling Premium actions without paying | M | Tier checked on the server from the database | — |
| T6 | SQL injection | Crafted input reaching a query | L | Prisma and parameterised raw queries only | — |
| T7 | XSS | A deck name or upload rendering as HTML/JS | L | React escaping, no `dangerouslySetInnerHTML` with user data, uploads limited to raster images, CSP basics | The CSP has no `script-src` yet (AdSense needs care) |
| T8 | Clickjacking | The site framed by another site | L | `frame-ancestors 'none'` | — |
| T9 | Spam and abuse (sign-ups, contact, reports) | Bots | M | Rate limits, honeypot, Cloudflare Bot Fight Mode, IP bans | — |
| T10 | Denial of service | Request floods, holding live game streams open | M | Cloudflare, per-IP limits, at most 8 streams per IP, IP bans | Rooms live in memory: a restart ends games |
| T11 | Peeking at hidden game info | Reading the live game stream | L | Seat secrets stop acting for another player | Hands are sent to every player at the table, so a technical player could read them. Fine for casual play, not for anything competitive |
| T12 | Joining private games | Guessing 5-character room codes | L | Rate limits on streams and actions; seats need a secret | Codes are short: anyone who guesses one can watch |
| T13 | Secret leak | Committed `.env`, logs, screenshots | M | `.gitignore`, secrets only in Coolify, no secrets in logs, the Police Station checks that `.env` can't be downloaded | Secrets in old git history must be rotated, not just deleted |
| T14 | Server compromise | Exposed admin ports, a weak SSH setup | M | Firewall allows only Cloudflare on 80/443, SSH key, Coolify behind the firewall | No 2FA on all owner accounts yet |
| T15 | Supply-chain attack | A malicious npm update | M | Dependabot, `npm audit`, lockfile, the Library's 7-day wait before bug-fix updates install | — |
| T16 | Owner account takeover | Phishing GitHub, Cloudflare, Stripe or Hetzner | M | Strong unique passwords | 2FA not yet confirmed on every account |
| T17 | Data loss | Disk failure, a bad migration | M | Nightly backups, 14 days kept, copies on the owner's PC | Restores haven't been rehearsed |
| T18 | Privacy breach (GDPR) | Over-collection, leaking emails | L | Data minimisation, cookieless analytics, hashed IPs, retention limits | — |
| T19 | Prompt injection through Nexus | Web pages telling Nexus's AI to change code | L | Web content treated as data; every code change needs the owner's OK, a snapshot and automatic rollback | — |

## Top follow-ups

1. Turn on 2FA for GitHub, Cloudflare, Hetzner, Coolify, Stripe, Resend and Google (T14, T16).
2. Add a "Sign out of all devices" button that bumps `sessionVersion` (T3).
3. Rehearse a restore from last night's backup onto a test copy (T17).
4. Tighten the CSP with `script-src` once AdSense goes live (T7).
5. Longer room codes, or private rooms that need an invite link, if competitive play is added (T11, T12).
