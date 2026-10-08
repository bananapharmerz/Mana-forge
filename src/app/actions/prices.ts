"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getCardByName, getAllPrintings } from "@/lib/scryfall";
import { livePrices, priceHistory, refreshPrices, type LivePrice } from "@/lib/prices";
import { clientIp, hit } from "@/lib/rateLimit";

// Prices for the cards on screen. Cards with no price yet (or more than a day old) are fetched
// from Scryfall first, a couple of hundred at most per call so a page never waits long.
export async function getLivePrices(ids: string[]): Promise<Record<string, LivePrice>> {
  const clean = [...new Set((Array.isArray(ids) ? ids : []).filter((id) => typeof id === "string" && /^[0-9a-f-]{8,40}$/i.test(id)))].slice(0, 400);
  if (!clean.length) return {};
  // Fetching fresh prices from Scryfall is rate limited per visitor; cached prices still show.
  if (hit(`prices:${await clientIp()}`, 30, 60 * 1000)) await refreshPrices({ ids: clean, limit: 225 }).catch(() => null);
  return livePrices(clean);
}

async function userId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Sign in to keep a watchlist.");
  return session.user.id;
}

export type WatchResult = { ok: true; message: string } | { ok: false; error: string };

// Watch a card by name: the cheapest printing that has a price, unless a specific one is given.
export async function addWatch(name: string, scryfallId?: string): Promise<WatchResult> {
  let uid: string;
  try {
    uid = await userId();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  if ((await db.priceWatch.count({ where: { userId: uid } })) >= 100) return { ok: false, error: "Your watchlist is full (100 cards)." };
  if (!hit(`watch-add:${uid}`, 30, 60 * 1000)) return { ok: false, error: "Slow down a little and try again in a minute." };
  let id = scryfallId && /^[0-9a-f-]{8,40}$/i.test(String(scryfallId)) ? String(scryfallId) : undefined;
  let cardName = String(name ?? "").trim().slice(0, 150);
  if (!cardName && !id) return { ok: false, error: "Enter a card name." };
  if (!id) {
    const prints = await getAllPrintings(cardName).catch(() => []);
    const priced = prints
      .map((p) => ({ p, usd: Number(p.prices?.usd ?? p.prices?.usd_foil ?? NaN) }))
      .filter((x) => Number.isFinite(x.usd))
      .sort((a, b) => a.usd - b.usd);
    const card = priced[0]?.p ?? (await getCardByName(cardName));
    if (!card) return { ok: false, error: `Couldn't find a card called “${cardName}”.` };
    id = card.id;
    cardName = card.name;
  }
  await db.priceWatch.upsert({ where: { userId_scryfallId: { userId: uid, scryfallId: id } }, create: { userId: uid, scryfallId: id, name: cardName }, update: {} });
  await refreshPrices({ ids: [id] }).catch(() => null);
  revalidatePath("/prices");
  return { ok: true, message: `Watching ${cardName}` };
}

export async function removeWatch(watchId: string): Promise<WatchResult> {
  const uid = await userId().catch(() => null);
  if (!uid) return { ok: false, error: "Sign in first." };
  await db.priceWatch.deleteMany({ where: { id: watchId, userId: uid } });
  revalidatePath("/prices");
  return { ok: true, message: "Removed" };
}

export async function setWatchTarget(watchId: string, target: number | null): Promise<WatchResult> {
  const uid = await userId().catch(() => null);
  if (!uid) return { ok: false, error: "Sign in first." };
  if (target !== null && !(Number.isFinite(target) && target > 0 && target < 100000)) return { ok: false, error: "Enter a price like 12.50" };
  const r = await db.priceWatch.updateMany({ where: { id: watchId, userId: uid }, data: { targetUsd: target === null ? null : Math.round(target * 100) / 100 } });
  if (!r.count) return { ok: false, error: "That card isn't on your watchlist." };
  revalidatePath("/prices");
  return { ok: true, message: target === null ? "Target cleared" : `We'll flag it at $${target.toFixed(2)} or less` };
}

export async function getPriceChart(scryfallId: string, days = 90) {
  const id = String(scryfallId ?? "");
  const d = Math.min(365, Math.max(1, Math.floor(Number(days)) || 90));
  return (await priceHistory([id], d))[id] ?? [];
}
