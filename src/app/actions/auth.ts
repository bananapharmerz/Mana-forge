"use server";

import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { clientIp, hit, TOO_MANY } from "@/lib/rateLimit";
import { breachCount } from "@/lib/pwned";
import { securityEvent } from "@/lib/securityLog";

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,63}$/;

export async function signup(
  email: unknown,
  password: unknown,
  name?: unknown
): Promise<{ ok: true } | { ok: false; error: string }> {
  const cleanEmail = String(email ?? "").trim().toLowerCase();
  const pass = String(password ?? "");
  const cleanName = String(name ?? "").replace(/\s+/g, " ").trim().slice(0, 40);

  // At most 5 new accounts per hour from one address.
  if (!hit(`signup:${await clientIp()}`, 5, 60 * 60 * 1000)) return { ok: false, error: TOO_MANY };

  if (!EMAIL.test(cleanEmail)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (pass.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }
  if (pass.length > 128) {
    return { ok: false, error: "Password must be at most 128 characters." };
  }
  if (!/[A-Za-z]/.test(pass) || !/\d/.test(pass)) {
    return { ok: false, error: "Use at least one letter and one number in your password." };
  }
  const local = cleanEmail.split("@")[0];
  if (local.length >= 4 && pass.toLowerCase().includes(local)) {
    return { ok: false, error: "Your password shouldn't contain your email name." };
  }

  // Refuse passwords that have already leaked in a data breach (they're the first ones attackers try).
  if (((await breachCount(pass)) ?? 0) > 0) {
    securityEvent("breached_password", "signup");
    return {
      ok: false,
      error: "That password has appeared in a known data breach, so it isn't safe to use. Please pick a different one.",
    };
  }

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

  return { ok: true };
}
