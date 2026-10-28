import { createHash, timingSafeEqual } from "node:crypto";
import { securityEvent } from "@/lib/securityLog";

// Admin routes (/api/admin/*) need the `x-admin-key` header to match ADMIN_API_KEY (at least 32
// characters). Compared as SHA-256 hashes in constant time. Without the key set, nothing passes.
//
// Rotation: ADMIN_API_KEY_NEXT (optional, also 32+ characters) is accepted alongside the current
// key, so Nexus can switch to the new key first and the old one is retired afterwards, with no
// downtime. Both are always compared, so the timing doesn't reveal which one matched.
//
// A wrong, non-empty key is counted for Nexus's Police Station ("admin_denied", tagged with the
// route name only). The key that was sent is never logged, not even a part of it.

const hashOf = (s: string) => createHash("sha256").update(s).digest();

function matches(given: Buffer, envName: "ADMIN_API_KEY" | "ADMIN_API_KEY_NEXT"): boolean {
  const key = process.env[envName]?.trim() ?? "";
  if (key.length < 32) return false;
  return timingSafeEqual(given, hashOf(key));
}

/** "/api/admin/price-history" → "price-history", so the Police see which door was tried. */
function routeName(req: Request): string {
  try {
    return new URL(req.url).pathname.replace(/^\/api\/admin\/?/, "").split("/")[0] || "admin";
  } catch {
    return "admin";
  }
}

export function adminAllowed(req: Request): boolean {
  const raw = req.headers.get("x-admin-key") ?? "";
  const given = hashOf(raw);
  const current = matches(given, "ADMIN_API_KEY");
  const next = matches(given, "ADMIN_API_KEY_NEXT");
  const ok = current || next;
  // Only count real attempts: plain visits without the header would just flood the Police.
  if (!ok && raw !== "") securityEvent("admin_denied", routeName(req));
  return ok;
}
