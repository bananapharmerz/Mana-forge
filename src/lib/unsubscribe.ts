import { createHmac, timingSafeEqual } from "node:crypto";
import { SITE } from "@/lib/site";

// One-click unsubscribe links: signed with AUTH_SECRET, so they work without signing in but can't be
// made for someone else's account. One per mailing: price alerts (the original links, unchanged) and
// the weekly roundup (signed separately, so one link can't switch off the other).
export type MailList = "alerts" | "weekly";
export const listOf = (l: string | null | undefined): MailList => (l === "weekly" ? "weekly" : "alerts");

const sign = (userId: string, list: MailList) =>
  createHmac("sha256", `${process.env.AUTH_SECRET ?? ""}|unsubscribe`)
    .update(list === "alerts" ? userId : `${userId}|${list}`)
    .digest("hex")
    .slice(0, 32);

export const unsubscribeUrl = (userId: string, list: MailList = "alerts") =>
  `${SITE.url}/unsubscribe?u=${encodeURIComponent(userId)}&s=${sign(userId, list)}${list === "alerts" ? "" : `&l=${list}`}`;

export function unsubscribeValid(userId: string | null, s: string | null, list: MailList = "alerts"): boolean {
  if (!userId || !s || !process.env.AUTH_SECRET || !/^[a-z0-9]{10,40}$/i.test(userId) || !/^[0-9a-f]{32}$/.test(s)) return false;
  const want = sign(userId, list);
  return timingSafeEqual(Buffer.from(s), Buffer.from(want));
}
