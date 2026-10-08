"use server";

import Stripe from "stripe";
import { SITE } from "@/lib/site";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import type { ProxyCard, PricingMode } from "@/lib/proxyTypes";
import { DECK_BUNDLE_MAX_CARDS, PRICE_PER_CARD_CENTS, proxyTotalCents } from "@/lib/proxyTypes";
import { clientIp, hit, TOO_MANY } from "@/lib/rateLimit";
import { SHOP_CLOSED, SHOP_ENABLED } from "@/lib/features";
import { scryfallImage, text, uploadedImage } from "@/lib/validate";

const MAX_PROXY_CARDS = 600;

// Cards come from the browser: keep only what we need, at sane sizes. Custom art must be a small
// uploaded picture; everything else must be a Scryfall image.
function cleanProxyCards(v: unknown): ProxyCard[] | null {
  if (!Array.isArray(v) || v.length > 300) return null;
  const out: ProxyCard[] = [];
  for (const raw of v) {
    if (!raw || typeof raw !== "object") return null;
    const c = raw as Record<string, unknown>;
    const quantity = Math.floor(Number(c.quantity));
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > 99) return null;
    const isCustomArt = c.isCustomArt === true;
    const imageUrl = isCustomArt ? uploadedImage(c.imageUrl) : scryfallImage(c.imageUrl);
    if (isCustomArt && !imageUrl) return null;
    out.push({
      scryfallId: text(c.scryfallId, 60),
      name: text(c.name, 150) || "Card",
      setName: c.setName === undefined ? undefined : text(c.setName, 100),
      artist: c.artist === undefined ? undefined : text(c.artist, 100),
      imageUrl,
      quantity,
      isCustomArt,
    });
  }
  return out;
}

export interface ShippingAddress {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export async function createProxyCheckoutSession(
  cards: ProxyCard[],
  email: string,
  shipping: ShippingAddress,
  pricingMode: PricingMode,
  // The buyer confirms they have the rights to any custom art they uploaded.
  artRightsConfirmed = false
): Promise<
  | { ok: true; url: string }
  | { ok: false; error: string; configured: boolean }
> {
  if (!SHOP_ENABLED) return { ok: false, error: SHOP_CLOSED, configured: true };
  if (!hit(`checkout:${await clientIp()}`, 10, 10 * 60 * 1000)) return { ok: false, error: TOO_MANY, configured: true };
  if (pricingMode !== "bundle" && pricingMode !== "per-card") return { ok: false, error: "Pick a pricing option.", configured: true };
  const cleanCards = cleanProxyCards(cards);
  if (!cleanCards) return { ok: false, error: "Your proxy project has a card we couldn't read (custom art must be a PNG, JPEG or WebP under 2 MB).", configured: true };
  cards = cleanCards;
  if (cards.some((c) => c.isCustomArt) && artRightsConfirmed !== true) {
    return { ok: false, error: "Please confirm you own or have permission to use the custom art you uploaded.", configured: true };
  }
  const cardCount = cards.reduce((s, c) => s + c.quantity, 0);
  if (cardCount > MAX_PROXY_CARDS) return { ok: false, error: `Orders are limited to ${MAX_PROXY_CARDS} cards. Split it into two orders.`, configured: true };
  if (cardCount === 0) {
    return { ok: false, error: "Your proxy project is empty.", configured: true };
  }
  if (pricingMode === "bundle" && cardCount > DECK_BUNDLE_MAX_CARDS) {
    return {
      ok: false,
      error: `The bundle price covers up to ${DECK_BUNDLE_MAX_CARDS} cards. Switch to per-card pricing or trim your project.`,
      configured: true,
    };
  }
  email = String(email ?? "").trim().slice(0, 254);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Enter a valid email address.", configured: true };
  }
  const s = (shipping ?? {}) as Partial<ShippingAddress>;
  shipping = {
    name: text(s.name, 100),
    line1: text(s.line1, 200),
    line2: s.line2 ? text(s.line2, 200) : undefined,
    city: text(s.city, 100),
    state: text(s.state, 100),
    postalCode: text(s.postalCode, 20),
    country: text(s.country, 60),
  };
  if (!shipping.name || !shipping.line1 || !shipping.city || !shipping.postalCode) {
    return { ok: false, error: "Fill in your shipping address.", configured: true };
  }


  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return {
      ok: false,
      configured: false,
      error:
        "Payments aren't set up yet — the site owner needs to add a Stripe secret key (STRIPE_SECRET_KEY) before proxy orders can be paid for.",
    };
  }

  const session = await auth();
  const totalCents = proxyTotalCents(cardCount, pricingMode);

  const order = await db.proxyOrder.create({
    data: {
      userId: session?.user?.id,
      email: email.trim().toLowerCase(),
      shippingAddress: JSON.stringify(shipping),
      cards: JSON.stringify(cards),
      cardCount,
      pricingMode,
      totalCents,
      status: "pending",
    },
  });

  const stripe = new Stripe(secretKey);
  const origin = (process.env.APP_URL || SITE.url).replace(/\/+$/, "");

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
    pricingMode === "bundle"
      ? [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: totalCents,
              product_data: {
                name: "Proxy Deck Bundle",
                description: `Flat rate for up to ${DECK_BUNDLE_MAX_CARDS} custom proxy cards (${cardCount} cards)`,
              },
            },
          },
        ]
      : [
          {
            quantity: cardCount,
            price_data: {
              currency: "usd",
              unit_amount: PRICE_PER_CARD_CENTS,
              product_data: { name: "Custom MTG Proxy Card" },
            },
          },
        ];

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: email.trim(),
    line_items: lineItems,
    success_url: `${origin}/proxies/success?order=${order.id}`,
    cancel_url: `${origin}/proxies`,
    metadata: { proxyOrderId: order.id },
  });

  await db.proxyOrder.update({
    where: { id: order.id },
    data: { stripeSessionId: checkoutSession.id },
  });

  if (!checkoutSession.url) {
    return { ok: false, error: "Stripe didn't return a checkout URL.", configured: true };
  }

  return { ok: true, url: checkoutSession.url };
}
