import { securityEvent } from "@/lib/securityLog";
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

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
      await db.user.update({
        where: { id: userId },
        data: {
          tier: "premium",
          stripeSubscriptionId:
            typeof session.subscription === "string" ? session.subscription : session.subscription?.id,
        },
      });
    }
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const userId = subscription.metadata?.userId;
    if (userId) {
      const active = subscription.status === "active" || subscription.status === "trialing";
      await db.user.update({
        where: { id: userId },
        data: {
          tier: active ? "premium" : "free",
          stripeSubscriptionId: active ? subscription.id : null,
        },
      });
    }
  }

  return NextResponse.json({ received: true });
}
