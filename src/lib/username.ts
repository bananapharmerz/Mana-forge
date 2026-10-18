// Public-profile handles (/u/<username>). Handles are stored lowercased and are unique. They are
// optional: an account has none until the member picks one. Validation keeps them URL-clean and
// clear of the site's own route names so a profile URL can never shadow a real page.

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;

// Top-level route segments a handle must not take, so /u/<name> can never collide with a real
// page's path if handles are ever surfaced elsewhere, and so names can't impersonate site areas.
const RESERVED = new Set([
  "u", "account", "admin", "api", "login", "logout", "signup", "signout", "forgot-password",
  "reset-password", "premium", "cancel", "settings", "profile", "deck-builder", "decks", "deck",
  "commanders", "commander", "prices", "price", "spoilers", "packs", "play", "community",
  "proxies", "store", "cart", "challenge", "vote", "articles", "legal", "about", "contact",
  "links", "r", "sitemap", "robots", "opengraph-image", "twitter-image", "favicon",
  "mana-forge", "manaforge", "anonymous", "null", "undefined", "me", "you", "support", "help",
  "edhrec-alternative", "commander-deck-building-guide",
]);

/** Lowercase + trim, so "Andrew" and " andrew " both normalise to "andrew". */
export function normalizeUsername(raw: unknown): string {
  return String(raw ?? "").trim().toLowerCase();
}

export type UsernameCheck =
  | { ok: true; value: string }
  | { ok: false; error: string };

/**
 * Validate a chosen handle. Letters, digits and underscores only; must start with a letter or
 * digit; 3–20 characters; not a reserved route name. Returns the normalised value on success.
 */
export function validateUsername(raw: unknown): UsernameCheck {
  const value = normalizeUsername(raw);
  if (!value) return { ok: false, error: "Pick a username." };
  if (value.length < USERNAME_MIN) return { ok: false, error: `Usernames are at least ${USERNAME_MIN} characters.` };
  if (value.length > USERNAME_MAX) return { ok: false, error: `Keep it to ${USERNAME_MAX} characters or fewer.` };
  if (!/^[a-z0-9][a-z0-9_]*$/.test(value)) {
    return { ok: false, error: "Use letters, numbers and underscores only, starting with a letter or number." };
  }
  if (RESERVED.has(value)) return { ok: false, error: "That username is reserved — pick another." };
  return { ok: true, value };
}
