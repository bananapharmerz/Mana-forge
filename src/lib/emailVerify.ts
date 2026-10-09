import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { SITE } from "@/lib/site";

// "Confirm your email": a random link (only its hash is stored), valid for 7 days, used once.
// Until confirmed, the account works normally, but the site doesn't send it price alerts (so a
// mistyped or someone else's address never gets mail it didn't ask for).

const hash = (t: string) => createHash("sha256").update(t).digest("hex");
const WEEK = 7 * 24 * 60 * 60 * 1000;

export async function verifyLink(userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await db.emailVerification.create({ data: { userId, tokenHash: hash(token), expiresAt: new Date(Date.now() + WEEK) } });
  return `${SITE.url}/verify-email?token=${token}`;
}

export async function confirmEmail(token: string): Promise<"ok" | "already" | "expired" | "invalid"> {
  const t = token.trim();
  if (!/^[A-Za-z0-9_-]{30,60}$/.test(t)) return "invalid";
  const row = await db.emailVerification.findUnique({ where: { tokenHash: hash(t) } });
  if (!row) return "invalid";
  if (row.usedAt) return "already";
  if (row.expiresAt.getTime() < Date.now()) return "expired";
  await db.$transaction([
    db.emailVerification.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
    db.user.update({ where: { id: row.userId }, data: { emailVerifiedAt: new Date() } }),
  ]);
  return "ok";
}
