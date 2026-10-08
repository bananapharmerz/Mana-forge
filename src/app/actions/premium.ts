"use server";

import Stripe from "stripe";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { PREMIUM_CURRENCY, PREMIUM_PRICE_CENTS } from "@/lib/tier";
import { SITE } from "@/lib/site";
import { clientIp, hit, TOO_MANY } from "@/lib/rateLimit";
import { randomUUID } from "node:crypto";

export async function getMyTier(): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await db.user.findUnique({ where: { id: session.user.id } });
  return user?.tier ?? null;
}

// EU consumers have a 14-day right to withdraw from online purchases. For a subscription that
// starts straight away, they must expressly ask for it to start now and confirm they know the
// withdrawal right ends once it does — that's the `startNow` checkbox on the Premium page.
export async function createPremiumCheckoutSession(startNow?: unknown): Promise<
  | { ok: true; url: string }
  | { ok: false; error: string; configured: boolean }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Sign in first.", configured: true };
  }

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user) return { ok: false, error: "Account not found.", configured: true };
  if (user.tier === "premium") {
    return { ok: false, error: "You're already Premium.", configured: true };
  }
  if (startNow !== true) {
    return { ok: false, error: "Tick the box to start Premium straight away.", configured: true };
  }
  if (!hit(`premium:${user.id}`, 10, 10 * 60 * 1000)) return { ok: false, error: TOO_MANY, configured: true };

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return {
      ok: false,
      configured: false,
      error:
        "Payments aren't set up yet — the site owner needs to add a Stripe secret key (STRIPE_SECRET_KEY) before Premium can be purchased.",
    };
  }

  const stripe = new Stripe(secretKey);
  const origin = (process.env.APP_URL || SITE.url).replace(/\/+$/, "");

  let customerId = user.stripeCustomerId ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email });
    customerId = customer.id;
    await db.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
  }

  let checkoutSession: Stripe.Checkout.Session;
  try {
  checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: PREMIUM_CURRENCY,
          unit_amount: PREMIUM_PRICE_CENTS,
          recurring: { interval: "month" },
          product_data: {
            name: `${SITE.name} Premium`,
            description: "Unlimited decks, no ads, no game-start queue.",
          },
        },
      },
    ],
    success_url: `${origin}/premium?upgraded=1`,
    cancel_url: `${origin}/premium`,
    metadata: { userId: user.id, startNowConsentAt: new Date().toISOString() },
    subscription_data: { metadata: { userId: user.id, startNowConsentAt: new Date().toISOString() } },
    // Stripe's "Managed Payments" (Stripe as merchant of record) is on by default for this account
    // and doesn't allow custom_text. We sell directly, so it's switched off for this checkout.
    ...({ managed_payments: { enabled: false } } as object),
    custom_text: {
      submit: { message: "Premium starts right away. Cancel any time; you keep Premium until the end of the month you paid for." },
    },
  });
  } catch (e) {
    console.error("Premium checkout failed:", e);
    return { ok: false, error: "Checkout couldn't start. Please try again in a moment.", configured: true };
  }

  if (!checkoutSession.url) {
    return { ok: false, error: "Stripe didn't return a checkout URL.", configured: true };
  }

  return { ok: true, url: checkoutSession.url };
}

export async function createBillingPortalSession(): Promise<
  { ok: true; url: string } | { ok: false; error: string }
> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Sign in first." };

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user?.stripeCustomerId) {
    return { ok: false, error: "No billing account on file yet." };
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return { ok: false, error: "Payments aren't set up yet." };

  const stripe = new Stripe(secretKey);
  const origin = (process.env.APP_URL || SITE.url).replace(/\/+$/, "");

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${origin}/premium`,
  });

  return { ok: true, url: portalSession.url };
}

// ---- cancelling ---------------------------------------------------------------------------------
// German law (§ 312k BGB) requires an easy "cancel your contract" button. Signed-in members cancel
// instantly here; anyone else can send a request from /cancel, which the admin handles in Nexus.
// Cancelling stops the next renewal: Premium stays on until the end of the period already paid
// for, then Stripe ends the subscription and the webhook moves the account back to free.

const fmtDate = (unix: number | null | undefined) =>
  unix ? new Date(unix * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : null;

export type MySubscription =
  | { state: "signed_out" }
  | { state: "none" }
  | { state: "active"; renewsOn: string | null }
  | { state: "cancelling"; endsOn: string | null };

export async function getMySubscription(): Promise<MySubscription> {
  const session = await auth();
  if (!session?.user?.id) return { state: "signed_out" };
  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user?.stripeSubscriptionId || user.tier !== "premium") return { state: "none" };
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return { state: "active", renewsOn: null };
  try {
    const sub = await new Stripe(key).subscriptions.retrieve(user.stripeSubscriptionId);
    const end = sub.cancel_at ?? sub.items.data[0]?.current_period_end;
    return sub.cancel_at_period_end || sub.cancel_at ? { state: "cancelling", endsOn: fmtDate(end) } : { state: "active", renewsOn: fmtDate(end) };
  } catch {
    return { state: "active", renewsOn: null };
  }
}

export async function cancelMySubscription(): Promise<{ ok: true; endsOn: string | null } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Sign in first, or use the form below." };
  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user?.stripeSubscriptionId) return { ok: false, error: "You don't have an active subscription." };
  if (!hit(`cancel:${user.id}`, 5, 10 * 60 * 1000)) return { ok: false, error: TOO_MANY };
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return { ok: false, error: "Payments aren't set up yet." };
  try {
    const sub = await new Stripe(key).subscriptions.update(user.stripeSubscriptionId, { cancel_at_period_end: true });
    return { ok: true, endsOn: fmtDate(sub.cancel_at ?? sub.items.data[0]?.current_period_end) };
  } catch {
    return { ok: false, error: `That didn't go through. Please try again, or email us and we'll cancel it for you.` };
  }
}

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,63}$/;

/** For people who can't sign in: records the request; the admin cancels it from Nexus. */
export async function requestCancellation(email: unknown, note?: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const clean = String(email ?? "").trim().toLowerCase().slice(0, 254);
  if (!EMAIL.test(clean)) return { ok: false, error: "Enter the email address of your account." };
  if (!hit(`cancelreq:${await clientIp()}`, 5, 60 * 60 * 1000)) return { ok: false, error: TOO_MANY };
  const user = await db.user.findUnique({ where: { email: clean }, select: { id: true } });
  const text = String(note ?? "").replace(/\s+/g, " ").trim().slice(0, 500) || null;
  await db.$executeRaw`
    INSERT INTO "CancelRequest" ("id", "email", "userId", "note", "status", "createdAt")
    VALUES (${randomUUID()}, ${clean}, ${user?.id ?? null}, ${text}, 'open', ${new Date().toISOString()})`;
  // Same answer whether or not the email has an account, so the form can't be used to look people up.
  return { ok: true };
}
