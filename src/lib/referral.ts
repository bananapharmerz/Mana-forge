import { randomBytes } from "node:crypto";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { emailHtml, esc, sendEmail } from "@/lib/email";
import { SITE, absoluteUrl } from "@/lib/site";
import { PREMIUM_CURRENCY, PREMIUM_PRICE_CENTS } from "@/lib/tier";

// Refer a friend.
//   - Everyone has an invite link: /r/<code>. Opening it remembers the code in a cookie for 60 days.
//   - A friend who signs up with that cookie is linked to the person who invited them.
//   - The friend's first Premium checkout gets FRIEND_DISCOUNT (50% off the first 3 months).
//   - When the friend first actually pays, the inviter gets a month of Premium as credit on their
//     Stripe balance (used up by their next invoices). At most MAX_REWARDS a year per person.

export const REF_COOKIE = "mf_ref";
export const FRIEND_PERCENT = 50;
export const FRIEND_MONTHS = 3;
export const FRIEND_COUPON = `friend-${FRIEND_PERCENT}-${FRIEND_MONTHS}m`;
export const REWARD_CENTS = PREMIUM_PRICE_CENTS;
export const MAX_REWARDS = 12;
const CODE = /^[a-z2-9]{6,12}$/;
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"; // no 0/o/1/l/i, easy to read out loud

export const validCode = (c: unknown): c is string => typeof c === "string" && CODE.test(c.toLowerCase());

/** The user's invite code, made the first time they ask for it. */
export async function referralCodeFor(userId: string): Promise<string> {
  const u = await db.user.findUnique({ where: { id: userId }, select: { referralCode: true } });
  if (u?.referralCode) return u.referralCode;
  for (let i = 0; i < 5; i++) {
    const bytes = randomBytes(8);
    const code = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
    const ok = await db.user.updateMany({ where: { id: userId, referralCode: null }, data: { referralCode: code } }).then((r) => r.count === 1).catch(() => false);
    if (ok) return code;
    const again = await db.user.findUnique({ where: { id: userId }, select: { referralCode: true } });
    if (again?.referralCode) return again.referralCode;
  }
  throw new Error("Couldn't make an invite code");
}

export const inviteLink = (code: string) => absoluteUrl(`/r/${code}`);

/** Who invited a new account (from the cookie), or null. Never the person themselves. */
export async function referrerFromCode(code: unknown, newEmail: string): Promise<string | null> {
  if (!validCode(code)) return null;
  const r = await db.user.findUnique({ where: { referralCode: code.toLowerCase() }, select: { id: true, email: true } });
  return r && r.email !== newEmail ? r.id : null;
}

/** The friend discount coupon in Stripe, created the first time it's needed. */
export async function friendCoupon(stripe: Stripe): Promise<string | null> {
  try {
    await stripe.coupons.retrieve(FRIEND_COUPON);
    return FRIEND_COUPON;
  } catch {
    try {
      await stripe.coupons.create({ id: FRIEND_COUPON, name: `Friend of a ${SITE.name} member: ${FRIEND_PERCENT}% off`, percent_off: FRIEND_PERCENT, duration: "repeating", duration_in_months: FRIEND_MONTHS });
      return FRIEND_COUPON;
    } catch {
      return null;
    }
  }
}

/**
 * The friend `refereeId` just paid for the first time: give whoever invited them a month of credit.
 * Safe to call more than once (referralRewardedAt is claimed first, atomically).
 */
export async function rewardReferrer(stripe: Stripe, refereeId: string): Promise<boolean> {
  const friend = await db.user.findUnique({ where: { id: refereeId }, select: { referredById: true, referralRewardedAt: true, name: true } });
  if (!friend?.referredById || friend.referralRewardedAt) return false;
  const claimed = await db.user.updateMany({ where: { id: refereeId, referralRewardedAt: null }, data: { referralRewardedAt: new Date() } });
  if (claimed.count !== 1) return false;
  const inviter = await db.user.findUnique({ where: { id: friend.referredById }, select: { id: true, email: true, name: true, stripeCustomerId: true, referralRewards: true } });
  if (!inviter || inviter.referralRewards >= MAX_REWARDS) return false;
  try {
    let customer = inviter.stripeCustomerId;
    if (!customer) {
      customer = (await stripe.customers.create({ email: inviter.email })).id;
      await db.user.update({ where: { id: inviter.id }, data: { stripeCustomerId: customer } });
    }
    await stripe.customers.createBalanceTransaction(customer, {
      amount: -REWARD_CENTS,
      currency: PREMIUM_CURRENCY,
      description: `Referral reward: a friend joined ${SITE.name} Premium`,
    });
    await db.user.update({ where: { id: inviter.id }, data: { referralRewards: { increment: 1 } } });
  } catch (e) {
    // Give the reward another chance next time instead of losing it.
    await db.user.update({ where: { id: refereeId }, data: { referralRewardedAt: null } }).catch(() => null);
    console.error("[referral] couldn't credit the referrer:", e instanceof Error ? e.message : e);
    return false;
  }
  const amount = `€${(REWARD_CENTS / 100).toFixed(2)}`;
  void sendEmail({
    to: inviter.email,
    subject: `Your friend joined ${SITE.name} Premium: ${amount} for you`,
    html: emailHtml({
      heading: "Thanks for spreading the word!",
      body: `<p>Someone you invited just started paying for ${esc(SITE.name)} Premium, so we've added <b>${esc(amount)}</b> of credit to your account, one free month. It's used automatically on your next Premium payment.</p>`,
      button: { label: "Invite another friend", url: absoluteUrl("/account#invite") },
    }),
    text: `Someone you invited just started paying for ${SITE.name} Premium, so we've added ${amount} of credit to your account (one free month). It's used automatically on your next Premium payment. Invite another friend: ${absoluteUrl("/account#invite")}`,
  }).catch(() => null);
  return true;
}
