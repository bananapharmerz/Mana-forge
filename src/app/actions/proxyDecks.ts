"use server";

// Premium perk for the proxy builder: load a whole saved deck into the print project in one click.
// The basic print-at-home PDF stays free for everyone; this only saves the card-by-card work.

import { auth } from "@/auth";
import { db } from "@/lib/db";
import type { DeckCard } from "@/lib/deckTypes";
import type { ProxyCard } from "@/lib/proxyTypes";
import { hit, TOO_MANY } from "@/lib/rateLimit";

export interface ProxyDeckSummary {
  id: string;
  name: string;
  commanderName: string;
}

export type ProxyAccess =
  | { signedIn: false; premium: false; decks: [] }
  | { signedIn: true; premium: boolean; decks: ProxyDeckSummary[] };

/** Who's looking (signed in? Premium?) and, for Premium members, their decks to print. */
export async function getProxyAccess(): Promise<ProxyAccess> {
  const session = await auth();
  if (!session?.user?.id) return { signedIn: false, premium: false, decks: [] };
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { tier: true } });
  const premium = user?.tier === "premium";
  if (!premium) return { signedIn: true, premium: false, decks: [] };
  const decks = await db.deck.findMany({
    where: { ownerId: session.user.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, commanderName: true },
  });
  return { signedIn: true, premium: true, decks };
}

function toProxy(c: DeckCard, quantity: number): ProxyCard {
  return {
    isToken: c.category === "Tokens",
    scryfallId: c.scryfallId,
    name: c.name,
    imageUrl: c.imageUrl,
    backImageUrl: c.backImageUrl,
    quantity,
  };
}

/** Every card of one of your decks (commander, partner and companion included) as proxy entries. */
export async function getDeckProxyCards(
  deckId: string
): Promise<{ ok: true; name: string; cards: ProxyCard[] } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Sign in to print your decks." };
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { tier: true } });
  if (user?.tier !== "premium") return { ok: false, error: "Printing a whole deck in one click is a Premium feature." };
  if (!hit(`proxy-deck:${session.user.id}`, 60, 60 * 60 * 1000)) return { ok: false, error: TOO_MANY };

  const deck = await db.deck.findUnique({ where: { id: String(deckId) } });
  if (!deck || deck.ownerId !== session.user.id) return { ok: false, error: "Deck not found." };

  const parse = <T,>(json: string | null): T | null => {
    if (!json) return null;
    try {
      return JSON.parse(json) as T;
    } catch {
      return null;
    }
  };
  const command = [deck.commanderData, deck.partnerCommanderData, deck.companionData]
    .map((j) => parse<DeckCard>(j))
    .filter((c): c is DeckCard => !!c);
  const cards = parse<DeckCard[]>(deck.cards) ?? [];

  // Merge by printing so a card that appears twice (e.g. commander also listed) prints once per copy.
  const byId = new Map<string, ProxyCard>();
  for (const c of command) byId.set(c.scryfallId, toProxy(c, 1));
  for (const c of cards) {
    // Tokens print one of each; everything else as many copies as the deck runs.
    const qty = c.category === "Tokens" ? 1 : Math.max(1, Math.min(99, Math.floor(c.quantity || 1)));
    const prev = byId.get(c.scryfallId);
    byId.set(c.scryfallId, prev ? { ...prev, quantity: prev.quantity + qty } : toProxy(c, qty));
  }
  return { ok: true, name: deck.name, cards: [...byId.values()].filter((c) => c.imageUrl || c.name) };
}
