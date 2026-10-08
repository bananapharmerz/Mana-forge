// Simple in-memory rate limits, so nobody can hammer logins, signups, checkouts or game rooms.
// Counts reset when the server restarts, which is fine for a single-server site. Each limit is
// "at most `max` hits per `windowMs` for this key" (key = an IP address, an email, a user id…).

import { headers } from "next/headers";
import { securityEvent } from "@/lib/securityLog";

type Bucket = number[]; // timestamps of recent hits

const g = globalThis as unknown as { __mfRate?: Map<string, Bucket>; __mfRateSweep?: ReturnType<typeof setInterval> };
const buckets: Map<string, Bucket> = g.__mfRate ?? (g.__mfRate = new Map<string, Bucket>());
if (!g.__mfRateSweep) {
  // Forget old entries every 10 minutes so memory stays small.
  g.__mfRateSweep = setInterval(() => {
    const cutoff = Date.now() - 60 * 60 * 1000;
    for (const [k, b] of buckets) if (!b.length || b[b.length - 1] < cutoff) buckets.delete(k);
  }, 10 * 60 * 1000);
  g.__mfRateSweep.unref?.();
}

/** Records a hit; returns true if it's allowed, false if the limit is reached. */
export function hit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const b = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (b.length >= max) {
    buckets.set(key, b);
    const area = key.split(":")[0];
    securityEvent(area === "login" ? "login_locked" : "rate_limited", area);
    return false;
  }
  b.push(now);
  buckets.set(key, b);
  return true;
}

/** Clears a key (e.g. after a successful login). */
export function reset(key: string) {
  buckets.delete(key);
}

export function ipFrom(h: Headers): string {
  // Behind Cloudflare every request arrives from a Cloudflare server, so use the visitor IP it passes on.
  // Only trusted when TRUST_CLOUDFLARE=1 (set once the site is proxied and the firewall only admits Cloudflare).
  const cf = process.env.TRUST_CLOUDFLARE === "1" ? h.get("cf-connecting-ip")?.trim() : "";
  if (cf) return cf;
  const fwd = h.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0] : h.get("x-real-ip") || "local").trim() || "local";
}

/** The visitor's IP inside a server action or server component. */
export async function clientIp(): Promise<string> {
  try {
    return ipFrom(await headers());
  } catch {
    return "local";
  }
}

export const TOO_MANY = "Too many attempts. Please wait a few minutes and try again.";
