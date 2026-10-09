import { createHash, timingSafeEqual } from "node:crypto";

// Admin routes (/api/admin/*) need the `x-admin-key` header to match ADMIN_API_KEY (at least 32
// characters). Compared as SHA-256 hashes in constant time. Without the key set, nothing passes.
export function adminAllowed(req: Request): boolean {
  const key = process.env.ADMIN_API_KEY?.trim() ?? "";
  if (key.length < 32) return false;
  const given = req.headers.get("x-admin-key") ?? "";
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(key).digest();
  return timingSafeEqual(a, b);
}
