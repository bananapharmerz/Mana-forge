"use server";

import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { clientIp, hit, reset, TOO_MANY } from "@/lib/rateLimit";
import { passwordProblem } from "@/lib/passwordRules";
import { emailHtml, sendEmail } from "@/lib/email";
import { SITE } from "@/lib/site";

const HOUR = 60 * 60 * 1000;
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,63}$/;
const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

/**
 * Emails a one-time reset link if the address has an account. The answer is the same either way,
 * so the form can't be used to find out who has an account.
 */
export async function requestPasswordReset(email: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const clean = String(email ?? "").trim().toLowerCase().slice(0, 254);
  if (!EMAIL.test(clean)) return { ok: false, error: "Enter a valid email address." };
  const ip = await clientIp();
  if (!hit(`resetreq:${ip}`, 5, HOUR)) return { ok: false, error: TOO_MANY };
  // At most 3 reset emails an hour to one address, so nobody can flood someone's inbox.
  if (!hit(`resetreq:email:${clean}`, 3, HOUR)) return { ok: true };

  const user = await db.user.findUnique({ where: { email: clean }, select: { id: true, email: true } });
  if (!user) return { ok: true };

  const token = randomBytes(32).toString("base64url");
  await db.passwordReset.deleteMany({ where: { userId: user.id, usedAt: null } });
  await db.passwordReset.create({ data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + HOUR) } });

  const link = `${SITE.url}/reset-password?token=${token}`;
  await sendEmail({
    to: user.email,
    subject: `Reset your ${SITE.name} password`,
    text: `Someone (hopefully you) asked to reset the password for your ${SITE.name} account.\n\nChoose a new password here (the link works once and expires in an hour):\n${link}\n\nIf you didn't ask for this, ignore this email; your password stays the same.`,
    html: emailHtml({
      heading: "Reset your password",
      body: `<p>Someone (hopefully you) asked to reset the password for your ${SITE.name} account.</p><p>The link works once and expires in an hour.</p><p style="color:#7a7488;font-size:13px">If you didn't ask for this, ignore this email; your password stays the same.</p>`,
      button: { label: "Choose a new password", url: link },
    }),
  });
  return { ok: true };
}

/** Sets a new password from a reset link, then signs the account out everywhere else. */
export async function resetPassword(token: unknown, password: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const t = String(token ?? "").trim();
  const pass = String(password ?? "");
  if (!hit(`resetset:${await clientIp()}`, 10, HOUR)) return { ok: false, error: TOO_MANY };
  if (!/^[A-Za-z0-9_-]{30,80}$/.test(t)) return { ok: false, error: "This reset link isn't valid. Ask for a new one." };

  const row = await db.passwordReset.findUnique({ where: { tokenHash: hashToken(t) } });
  if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) {
    return { ok: false, error: "This reset link has expired or was already used. Ask for a new one." };
  }
  const user = await db.user.findUnique({ where: { id: row.userId }, select: { id: true, email: true } });
  if (!user) return { ok: false, error: "This reset link isn't valid. Ask for a new one." };

  const problem = await passwordProblem(pass, user.email, "reset");
  if (problem) return { ok: false, error: problem };

  const passwordHash = await bcrypt.hash(pass, 12);
  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { passwordHash, sessionVersion: { increment: 1 } } }),
    db.passwordReset.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
    db.passwordReset.deleteMany({ where: { userId: user.id, usedAt: null } }),
  ]);
  reset(`login:email:${user.email}`); // a fresh password shouldn't start out locked

  void sendEmail({
    to: user.email,
    subject: `Your ${SITE.name} password was changed`,
    text: `The password for your ${SITE.name} account was just changed, and every other device was signed out.\n\nIf this wasn't you, reset it again right away at ${SITE.url}/forgot-password and write to us.`,
    html: emailHtml({
      heading: "Your password was changed",
      body: `<p>The password for your ${SITE.name} account was just changed, and every other device was signed out.</p><p>If this wasn't you, reset it again right away and let us know.</p>`,
      button: { label: "Reset it again", url: `${SITE.url}/forgot-password` },
    }),
  });
  return { ok: true };
}
