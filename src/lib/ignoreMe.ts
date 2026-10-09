import { createHmac, timingSafeEqual } from "node:crypto";

// Keeps the owner's own visits (and Nexus) out of the visitor counts.
// Nexus makes a short-lived signed link (/api/admin/ignore-me?t=..&s=..); opening it in a browser
// sets the `mf_ignore` cookie for a year, and that browser is no longer counted.
// Both are signed with ADMIN_API_KEY, so nobody can make the link without the key.

export const IGNORE_COOKIE = "mf_ignore";
const key = () => process.env.ADMIN_API_KEY?.trim() ?? "";
const sign = (v: string) => createHmac("sha256", key()).update(v).digest("hex").slice(0, 32);
const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export const ignoreCookieValue = () => sign("ignore-me");

/** True when the request carries a valid "don't count me" cookie. */
export function isIgnored(cookieHeader: string | null): boolean {
  if (key().length < 32 || !cookieHeader) return false;
  const m = cookieHeader.match(/(?:^|;\s*)mf_ignore=([0-9a-f]{32})/);
  return !!m && same(m[1], ignoreCookieValue());
}

/** Checks a link made by Nexus: valid for 10 minutes. */
export function linkValid(t: string | null, s: string | null): boolean {
  if (key().length < 32 || !t || !s || !/^\d{10,14}$/.test(t)) return false;
  const age = Date.now() - Number(t);
  return age >= -60_000 && age < 10 * 60_000 && same(s, sign(`ignore:${t}`));
}

/** Nexus's own requests (they all say "Nexus" in the user agent). */
export const isNexus = (ua: string | null) => !!ua && /nexus/i.test(ua);
