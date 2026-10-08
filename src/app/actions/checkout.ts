"use server";

import Stripe from "stripe";
import { SITE } from "@/lib/site";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import type { CartItem } from "@/lib/cartTypes";
import { clientIp, hit, TOO_MANY } from "@/lib/rateLimit";
import { SHOP_CLOSED, SHOP_ENABLED } from "@/lib/features";

export async function createCheckoutSession(
  items: CartItem[],
  email: string
): Promise<
  | { ok: true; url: string }
  | { ok: false; error: string; configured: boolean }
> {
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, error: "Your cart is empty.", configured: true };
  }
  if (items.length > 50) return { ok: false, error: "That's too many different items for one order.", configured: true };
  email = String(email ?? "").trim().slice(0, 254);
  if (!SHOP_ENABLED) return { ok: false, error: SHOP_CLOSED, configured: true };
  if (!hit(`checkout:${await clientIp()}`, 10, 10 * 60 * 1000)) return { ok: false, error: TOO_MANY, configured: true };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Enter a valid email address.", configured: true };
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return {
      ok: false,
      configured: false,
      error:
        "Payments aren't set up yet — the site owner needs to add a Stripe secret key (STRIPE_SECRET_KEY) before checkout can process real payments.",
    };
  }

  // Never trust prices or names sent from the browser: look every product up and charge what
  // the store says it costs right now.
  const wanted = new Map<string, number>();
  for (const item of items) {
    const qty = Math.floor(Number(item.quantity));
    if (typeof item?.productId !== "string" || item.productId.length > 64 || !Number.isFinite(qty) || qty < 1 || qty > 99) {
      return { ok: false, error: "Your cart has an invalid item. Please refresh the cart and try again.", configured: true };
    }
    wanted.set(item.productId, (wanted.get(item.productId) ?? 0) + qty);
  }
  const products = await db.product.findMany({ where: { id: { in: [...wanted.keys()] } } });
  if (products.length !== wanted.size) {
    return { ok: false, error: "Something in your cart is no longer sold. Please remove it and try again.", configured: true };
  }
  const lines: CartItem[] = products.map((p) => ({
    productId: p.id,
    name: p.name,
    priceCents: p.priceCents,
    icon: p.icon,
    quantity: wanted.get(p.id) ?? 1,
  }));
  const short = lines.find((l) => (products.find((p) => p.id === l.productId)?.stock ?? 0) < l.quantity);
  if (short) {
    return { ok: false, error: `Sorry, there aren't enough ${short.name} in stock right now.`, configured: true };
  }

  const session = await auth();
  const totalCents = lines.reduce((s, i) => s + i.priceCents * i.quantity, 0);

  const order = await db.order.create({
    data: {
      userId: session?.user?.id,
      email: email.trim().toLowerCase(),
      items: JSON.stringify(lines),
      totalCents,
      status: "pending",
    },
  });

  const stripe = new Stripe(secretKey);
  const origin = (process.env.APP_URL || SITE.url).replace(/\/+$/, "");

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: email.trim(),
    line_items: lines.map((item) => ({
      quantity: item.quantity,
      price_data: {
        currency: "usd",
        unit_amount: item.priceCents,
        product_data: { name: item.name },
      },
    })),
    success_url: `${origin}/store/success?order=${order.id}`,
    cancel_url: `${origin}/store/cart`,
    metadata: { orderId: order.id },
  });

  await db.order.update({
    where: { id: order.id },
    data: { stripeSessionId: checkoutSession.id },
  });

  if (!checkoutSession.url) {
    return { ok: false, error: "Stripe didn't return a checkout URL.", configured: true };
  }

  return { ok: true, url: checkoutSession.url };
}
