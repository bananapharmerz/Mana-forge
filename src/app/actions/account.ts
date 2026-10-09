"use server";

import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { hit, TOO_MANY } from "@/lib/rateLimit";
import { emailHtml, sendEmail } from "@/lib/email";
import { SITE } from "@/lib/site";

async function me() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return db.user.findUnique({ where: { id: session.user.id } });
}

/** Signs this account out on every device (all sessions carry the old session version). */
export async function signOutEverywhere(): Promise<{ ok: boolean }> {
  const user = await me();
  if (!user) return { ok: false };
  await db.user.update({ where: { id: user.id }, data: { sessionVersion: { increment: 1 } } });
  return { ok: true };
}

/** Everything we hold about the account, as JSON (GDPR Art. 15 and 20). */
export async function exportMyData(): Promise<{ ok: true; json: string } | { ok: false; error: string }> {
  const user = await me();
  if (!user) return { ok: false, error: "Sign in first." };
  if (!hit(`export:${user.id}`, 5, 60 * 60 * 1000)) return { ok: false, error: TOO_MANY };
  const [decks, favorites, watches, orders, messages] = await Promise.all([
    db.deck.findMany({ where: { ownerId: user.id } }),
    db.favorite.findMany({ where: { userId: user.id } }),
    db.priceWatch.findMany({ where: { userId: user.id } }),
    db.order.findMany({ where: { userId: user.id } }).catch(() => []),
    db.contactMessage.findMany({ where: { userId: user.id } }).catch(() => []),
  ]);
  const data = {
    exportedAt: new Date().toISOString(),
    site: SITE.url,
    account: {
      email: user.email,
      name: user.name,
      tier: user.tier,
      createdAt: user.createdAt,
      priceAlerts: user.priceAlerts,
      hasSubscription: !!user.stripeSubscriptionId,
    },
    decks: decks.map((d) => ({ ...d, commanderData: safe(d.commanderData), partnerCommanderData: safe(d.partnerCommanderData), companionData: safe(d.companionData), cards: safe(d.cards) })),
    favorites,
    priceWatches: watches,
    orders,
    contactMessages: messages,
  };
  return { ok: true, json: JSON.stringify(data, null, 2) };
}
const safe = (s: string | null) => {
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
};

/**
 * Deletes the account and everything tied to it (decks, favourites, watchlist). Orders stay for
 * tax law without the link to the account. Needs the password, and no running subscription.
 */
export async function deleteMyAccount(password: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await me();
  if (!user) return { ok: false, error: "Sign in first." };
  if (!hit(`delete:${user.id}`, 5, 60 * 60 * 1000)) return { ok: false, error: TOO_MANY };
  if (!(await bcrypt.compare(String(password ?? ""), user.passwordHash))) return { ok: false, error: "That password isn't right." };
  if (user.stripeSubscriptionId && user.tier === "premium") {
    return { ok: false, error: "Cancel your Premium subscription first (on the Cancel page), then delete the account." };
  }
  const email = user.email;
  await db.$transaction([db.passwordReset.deleteMany({ where: { userId: user.id } }), db.user.delete({ where: { id: user.id } })]);
  void sendEmail({
    to: email,
    subject: `Your ${SITE.name} account is deleted`,
    html: emailHtml({ heading: "Account deleted", body: `<p>Your ${SITE.name} account and its decks, favourites and watchlist have been deleted. If you didn't do this, reply to this email straight away.</p>` }),
    text: `Your ${SITE.name} account and its decks, favourites and watchlist have been deleted. If you didn't do this, reply to this email straight away.`,
  }).catch(() => null);
  return { ok: true };
}

/** Sends a fresh "confirm your email" link (at most 3 an hour). */
export async function resendVerification(): Promise<{ ok: boolean; message: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, message: "Sign in first." };
  if (!hit(`verify-resend:${session.user.id}`, 3, 60 * 60 * 1000)) return { ok: false, message: TOO_MANY };
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { email: true, emailVerifiedAt: true } });
  if (!user) return { ok: false, message: "Account not found." };
  if (user.emailVerifiedAt) return { ok: true, message: "Your email is already confirmed." };
  const { verifyLink } = await import("@/lib/emailVerify");
  const link = await verifyLink(session.user.id);
  await sendEmail({
    to: user.email,
    subject: `Confirm your email for ${SITE.name}`,
    text: `Please confirm this is your email address for ${SITE.name}:\n${link}\n\nThe link works for 7 days. If you didn't ask for this, you can ignore it.`,
    html: emailHtml({
      heading: "Confirm your email",
      body: `<p>Tap the button to confirm this is your email address for ${SITE.name}. The link works for 7 days.</p><p style="color:#7a7488;font-size:13px">If you didn't ask for this, you can ignore it.</p>`,
      button: { label: "Confirm my email", url: link },
    }),
  });
  return { ok: true, message: `Sent. Check ${user.email} (and the spam folder).` };
}
