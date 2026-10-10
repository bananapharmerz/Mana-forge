"use server";

import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { clientIp, hit, TOO_MANY } from "@/lib/rateLimit";
import { passwordProblem } from "@/lib/passwordRules";
import { emailHtml, esc, sendEmail } from "@/lib/email";
import { SITE } from "@/lib/site";
import { verifyLink } from "@/lib/emailVerify";
import { humanCheck, turnstileSiteKey } from "@/lib/turnstile";
import { REF_COOKIE, referrerFromCode } from "@/lib/referral";
import { cookies } from "next/headers";
import { AGE_COOKIE } from "@/lib/googleSignIn";

/** The Turnstile site key for the forms (null while Turnstile is off). */
export async function getTurnstileSiteKey(): Promise<string | null> {
  return turnstileSiteKey();
}

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,63}$/;

export async function signup(
  email: unknown,
  password: unknown,
  name?: unknown,
  ofAge?: unknown,
  human?: unknown // Turnstile token
): Promise<{ ok: true } | { ok: false; error: string }> {
  // Accounts are for people 16 and over (GDPR consent age in Germany; see the Terms).
  if (ofAge !== true) return { ok: false, error: "You need to be 16 or older to create an account." };
  const cleanEmail = String(email ?? "").trim().toLowerCase();
  const pass = String(password ?? "");
  const cleanName = String(name ?? "").replace(/\s+/g, " ").trim().slice(0, 40);

  // At most 5 new accounts per hour from one address.
  const ip = await clientIp();
  if (!hit(`signup:${ip}`, 5, 60 * 60 * 1000)) return { ok: false, error: TOO_MANY };
  if (!(await humanCheck(human, ip))) return { ok: false, error: "Please confirm you're human (the check below the form), then try again." };

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

  // Came through a friend's invite link? Link the accounts (for the friend discount and the reward).
  const jar = await cookies();
  const referredById = await referrerFromCode(jar.get(REF_COOKIE)?.value, cleanEmail).catch(() => null);

  const created = await db.user.create({
    data: {
      email: cleanEmail,
      passwordHash,
      name: cleanName || undefined,
      referredById,
    },
  });
  if (referredById) jar.delete(REF_COOKIE);

  // A short welcome email with the "confirm your email" link (sending isn't awaited: sign-up never
  // waits on the mail service).
  const confirm = await verifyLink(created.id).catch(() => null);
  void sendEmail({
    to: cleanEmail,
    subject: `Welcome to ${SITE.name}`,
    text: `Welcome${cleanName ? `, ${cleanName}` : ""}!\n\nYour ${SITE.name} account is ready.${confirm ? ` Please confirm this is your email address:\n${confirm}\n` : ""}\nBuild a deck, browse commanders or start a game with friends:\n${SITE.url}/deck-builder\n\nIf you didn't create this account, you can ignore this email.`,
    html: emailHtml({
      heading: `Welcome${cleanName ? `, ${esc(cleanName)}` : ""}!`,
      body: `<p>Your ${esc(SITE.name)} account is ready. ${confirm ? "Tap the button to confirm this is your email address, then build a Commander deck, browse every commander, or start a game with friends." : "Build a Commander deck, browse every commander, or start a game with friends."}</p><p style="color:#7a7488;font-size:13px">If you didn't create this account, you can ignore this email.</p>`,
      button: confirm ? { label: "Confirm my email", url: confirm } : { label: "Start building", url: `${SITE.url}/deck-builder` },
    }),
  });

  return { ok: true };
}

/** Before "Continue with Google" on the sign-up page: remembers for 10 minutes that they confirmed they're 16+. */
export async function confirmAgeForGoogle(ofAge: unknown): Promise<{ ok: boolean; error?: string }> {
  if (ofAge !== true) return { ok: false, error: "Tick \u201cI'm 16 or older\u201d first." };
  const jar = await cookies();
  jar.set(AGE_COOKIE, "1", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 600, path: "/" });
  return { ok: true };
}
