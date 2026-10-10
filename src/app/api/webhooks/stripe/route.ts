import { securityEvent } from "@/lib/securityLog";
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SITE } from "@/lib/site";
import { emailHtml, esc, sendEmail } from "@/lib/email";
import { rewardReferrer } from "@/lib/referral";

export async function POST(req: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secretKey || !webhookSecret) {
    return NextResponse.json(
      { error: "Stripe is not configured on this server." },
      { status: 501 }
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  const body = await req.text();
  const stripe = new Stripe(secretKey);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    // Signed events older than 5 minutes are rejected here too, so a captured event can't be replayed.
    securityEvent("webhook_bad_signature", "stripe");
    console.warn("[stripe] webhook signature check failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  // A checkout is paid when Stripe says the money arrived: immediately for cards, later for
  // bank payments (async_payment_succeeded).
  const paidEvent =
    event.type === "checkout.session.async_payment_succeeded" ||
    (event.type === "checkout.session.completed" && (event.data.object as Stripe.Checkout.Session).payment_status === "paid");

  if (paidEvent) {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;
    const proxyOrderId = session.metadata?.proxyOrderId;
    // Only a pending order whose total matches what Stripe charged becomes paid; replays of old
    // events can't flip a refunded or fulfilled order back.
    const matches = (expected: number) => session.amount_total === expected && (session.currency ?? "usd") === "usd";
    if (orderId) {
      const order = await db.order.findUnique({ where: { id: orderId }, select: { totalCents: true, status: true } });
      if (order && order.status === "pending") {
        if (matches(order.totalCents)) await db.order.update({ where: { id: orderId }, data: { status: "paid" } });
        else {
          securityEvent("payment_mismatch", "stripe");
          console.error(`[stripe] order ${orderId}: Stripe charged ${session.amount_total} but the order is ${order.totalCents}; left pending for review.`);
        }
      }
    }
    if (proxyOrderId) {
      const order = await db.proxyOrder.findUnique({ where: { id: proxyOrderId }, select: { totalCents: true, status: true } });
      if (order && order.status === "pending") {
        if (matches(order.totalCents)) await db.proxyOrder.update({ where: { id: proxyOrderId }, data: { status: "paid" } });
        else {
          securityEvent("payment_mismatch", "stripe");
          console.error(`[stripe] proxy order ${proxyOrderId}: amount mismatch; left pending for review.`);
        }
      }
    }
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    if (userId && session.mode === "subscription") {
      const subId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      const user = await db.user.findUnique({ where: { id: userId }, select: { tier: true, stripeSubscriptionId: true } });
      if (user?.tier === "premium" && user.stripeSubscriptionId && subId && user.stripeSubscriptionId !== subId) {
        // A second Premium checkout went through (two tabs, say). Keep the first; flag the extra one for a refund.
        securityEvent("double_subscription", "stripe");
        console.error(`[stripe] user ${userId} paid for a second subscription ${subId} (keeping ${user.stripeSubscriptionId}); cancel and refund it in Stripe.`);
      } else if (user) {
        await db.user.update({ where: { id: userId }, data: { tier: "premium", stripeSubscriptionId: subId } });
        // Paid straight away (no trial): whoever invited them gets their reward now.
        if ((session.amount_total ?? 0) > 0) await rewardReferrer(stripe, userId).catch(() => false);
      }
    }
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const userId = subscription.metadata?.userId;
    const user = userId ? await db.user.findUnique({ where: { id: userId }, select: { stripeSubscriptionId: true } }) : null;
    if (userId && user) {
      const active = subscription.status === "active" || subscription.status === "trialing";
      const current = user.stripeSubscriptionId;
      // Only the member's current subscription decides their tier, so an old or duplicate one
      // ending (or arriving late) can't switch off Premium they're still paying for.
      if (active && (!current || current === subscription.id)) {
        await db.user.update({ where: { id: userId }, data: { tier: "premium", stripeSubscriptionId: subscription.id } });
        // The trial just turned into a paid subscription: whoever invited them gets their reward.
        const before = (event.data as { previous_attributes?: { status?: string } }).previous_attributes?.status;
        if (subscription.status === "active" && before === "trialing") await rewardReferrer(stripe, userId).catch(() => false);
      } else if (!active && (!current || current === subscription.id)) {
        await db.user.update({ where: { id: userId }, data: { tier: "free", stripeSubscriptionId: null } });
      }
    }
  }

  // Stripe sends this 3 days before a trial ends. Tell the member when the first charge comes and
  // how to cancel, as promised at checkout.
  if (event.type === "customer.subscription.trial_will_end") {
    const subscription = event.data.object as Stripe.Subscription;
    const userId = subscription.metadata?.userId;
    const user = userId ? await db.user.findUnique({ where: { id: userId }, select: { email: true } }) : null;
    if (user && subscription.trial_end && !subscription.cancel_at_period_end) {
      const when = new Date(subscription.trial_end * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
      const item = subscription.items.data[0]?.price;
      const amount = item?.unit_amount != null ? `€${(item.unit_amount / 100).toFixed(2)}` : "the Premium price";
      const per = item?.recurring?.interval ?? "month";
      const origin = (process.env.APP_URL || SITE.url).replace(/\/+$/, "");
      await sendEmail({
        to: user.email,
        subject: `Your ${SITE.name} Premium trial ends on ${when}`,
        html: emailHtml({
          heading: "Your free trial ends soon",
          body: `<p>Your free Premium trial ends on <b>${esc(when)}</b>. After that you'll be charged <b>${esc(amount)}</b> every ${esc(per)} until you cancel.</p><p>Want to keep it? Nothing to do. Don't want it? Cancel before ${esc(when)} and you won't pay anything.</p>`,
          button: { label: "Cancel or manage", url: `${origin}/cancel` },
        }),
        text: `Your free Premium trial ends on ${when}. After that you'll be charged ${amount} every ${per} until you cancel. Cancel before then and you won't pay anything: ${origin}/cancel`,
      }).catch(() => null);
    }
  }

  return NextResponse.json({ received: true });
}
