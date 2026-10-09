import { createHmac, timingSafeEqual } from "node:crypto";
import { SITE } from "@/lib/site";

// One-click unsubscribe from price alerts: a link signed with AUTH_SECRET, so it works without
// signing in but can't be made for someone else's account.
const sign = (userId: string) => createHmac("sha256", `${process.env.AUTH_SECRET ?? ""}|unsubscribe`).update(userId).digest("hex").slice(0, 32);

export const unsubscribeUrl = (userId: string) => `${SITE.url}/unsubscribe?u=${encodeURIComponent(userId)}&s=${sign(userId)}`;

export function unsubscribeValid(userId: string | null, s: string | null): boolean {
  if (!userId || !s || !process.env.AUTH_SECRET || !/^[a-z0-9]{10,40}$/i.test(userId) || !/^[0-9a-f]{32}$/.test(s)) return false;
  const want = sign(userId);
  return timingSafeEqual(Buffer.from(s), Buffer.from(want));
}
