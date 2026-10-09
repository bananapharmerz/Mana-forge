"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getEdhrecCommanderData, getMostPlayed } from "@/lib/edhrec";
import { cardImage, cardPriceUsd, getCardsByNames } from "@/lib/scryfall";
import { hit, TOO_MANY } from "@/lib/rateLimit";

export interface Upgrade {
  name: string;
  imageUrl?: string;
  usd: number;
  playRate: number; // share of this commander's decks on EDHREC that run it
}

// Premium perk: cards that lots of decks with this commander play, that this deck doesn't have
// yet, and that cost at most `maxUsd`. Ranked by how often they're played.
export async function getBudgetUpgrades(
  deckId: string,
  maxUsd: number
): Promise<{ ok: true; upgrades: Upgrade[] } | { ok: false; error: string; premium?: false }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Sign in to use upgrade suggestions.", premium: false };
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { tier: true } });
  if (user?.tier !== "premium") return { ok: false, error: "Budget upgrade suggestions are a Premium feature.", premium: false };
  if (!hit(`upgrades:${session.user.id}`, 30, 60 * 60 * 1000)) return { ok: false, error: TOO_MANY };

  const deck = await db.deck.findUnique({ where: { id: String(deckId) } });
  if (!deck || deck.ownerId !== session.user.id) return { ok: false, error: "Deck not found." };
  const cap = Number.isFinite(maxUsd) ? Math.min(Math.max(maxUsd, 0.25), 100) : 5;

  const data = await getEdhrecCommanderData(deck.commanderName);
  if (!data) return { ok: false, error: "No community data for this commander yet." };

  const have = new Set<string>([deck.commanderName.toLowerCase()]);
  for (const raw of [deck.partnerCommanderData, deck.companionData, deck.cards]) {
    if (!raw) continue;
    try {
      const v = JSON.parse(raw) as { name?: string } | { name?: string }[];
      for (const c of Array.isArray(v) ? v : [v]) if (c?.name) have.add(c.name.toLowerCase());
    } catch {}
  }

  const candidates = getMostPlayed(data, 200)
    .filter((c) => !have.has(c.name.toLowerCase()))
    .slice(0, 90);
  const rate = new Map(candidates.map((c) => [c.name.toLowerCase(), c.potential_decks ? c.num_decks / c.potential_decks : 0]));
  const cards = await getCardsByNames(candidates.map((c) => c.name));

  const upgrades: Upgrade[] = [];
  for (const card of cards) {
    const usd = cardPriceUsd(card);
    if (usd == null || usd > cap) continue;
    if (card.legalities?.commander && card.legalities.commander !== "legal") continue;
    upgrades.push({ name: card.name, imageUrl: cardImage(card), usd, playRate: rate.get(card.name.toLowerCase()) ?? 0 });
  }
  upgrades.sort((a, b) => b.playRate - a.playRate);
  return { ok: true, upgrades: upgrades.slice(0, 12) };
}
