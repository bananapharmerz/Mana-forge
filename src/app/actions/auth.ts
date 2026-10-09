"use server";

import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { clientIp, hit, TOO_MANY } from "@/lib/rateLimit";
import { passwordProblem } from "@/lib/passwordRules";
import { emailHtml, esc, sendEmail } from "@/lib/email";
import { SITE } from "@/lib/site";

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,63}$/;

export async function signup(
  email: unknown,
  password: unknown,
  name?: unknown,
  ofAge?: unknown
): Promise<{ ok: true } | { ok: false; error: string }> {
  // Accounts are for people 16 and over (GDPR consent age in Germany; see the Terms).
  if (ofAge !== true) return { ok: false, error: "You need to be 16 or older to create an account." };
  const cleanEmail = String(email ?? "").trim().toLowerCase();
  const pass = String(password ?? "");
  const cleanName = String(name ?? "").replace(/\s+/g, " ").trim().slice(0, 40);

  // At most 5 new accounts per hour from one address.
  if (!hit(`signup:${await clientIp()}`, 5, 60 * 60 * 1000)) return { ok: false, error: TOO_MANY };

  if (!EMAIL.test(cleanEmail)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  const problem = await passwordProblem(pass, cleanEmail, "signup");
  if (problem) return { ok: false, error: problem };

  const existing = await db.user.findUnique({ where: { email: cleanEmail } });
  if (existing) {
    return { ok: false, error: "An account with that email already exists. Try signing in." };
  }

  const passwordHash = await bcrypt.hash(pass, 12);

  await db.user.create({
    data: {
      email: cleanEmail,
      passwordHash,
      name: cleanName || undefined,
    },
  });

  // A short welcome email (not awaited: sign-up never waits on the mail service).
  void sendEmail({
    to: cleanEmail,
    subject: `Welcome to ${SITE.name}`,
    text: `Welcome${cleanName ? `, ${cleanName}` : ""}!\n\nYour ${SITE.name} account is ready. Build a deck, browse commanders or start a game with friends:\n${SITE.url}/deck-builder\n\nIf you didn't create this account, you can ignore this email.`,
    html: emailHtml({
      heading: `Welcome${cleanName ? `, ${esc(cleanName)}` : ""}!`,
      body: `<p>Your ${esc(SITE.name)} account is ready. Build a Commander deck, browse every commander, or start a game with friends.</p><p style="color:#7a7488;font-size:13px">If you didn't create this account, you can ignore this email.</p>`,
      button: { label: "Start building", url: `${SITE.url}/deck-builder` },
    }),
  });

  return { ok: true };
}
