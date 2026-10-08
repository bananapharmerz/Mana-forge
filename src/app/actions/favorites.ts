"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { cardImage, getCardsByNames } from "@/lib/scryfall";
import type { EdhrecDeckSource, EdhrecPublicDeck } from "@/lib/edhrec";
import type { MixedDeckItem, SiteDeckRow } from "./decks";

type ToggleResult = { ok: true; favorited: boolean } | { ok: false; error: string };

// Session cookies outlive the account they point at (e.g. dev-database resets) — check the
// user row is still real before writing anything with it as a foreign key.
async function requireExistingUserId(): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { id: true } });
  return user?.id ?? null;
}

export async function toggleFavoriteSiteDeck(deckId: string): Promise<ToggleResult> {
  const userId = await requireExistingUserId();
  if (!userId) return { ok: false, error: "Sign in to favorite decks." };
  deckId = String(deckId ?? "").slice(0, 64);

  const existing = await db.favorite.findUnique({
    where: { userId_deckId: { userId, deckId } },
  });

  if (existing) {
    await db.favorite.delete({ where: { id: existing.id } });
    revalidatePath("/decks");
    return { ok: true, favorited: false };
  }

  // Only public decks (or your own) can be favorited: a private deck stays private.
  const target = await db.deck.findUnique({ where: { id: deckId }, select: { isPublic: true, ownerId: true } });
  if (!target || (!target.isPublic && target.ownerId !== userId)) return { ok: false, error: "That deck isn't available." };
  await db.favorite.create({ data: { userId, deckId } });
  revalidatePath("/decks");
  return { ok: true, favorited: true };
}

export async function toggleFavoriteEdhrecDeck(
  deck: EdhrecPublicDeck,
  commanderName: string,
  source: EdhrecDeckSource | null
): Promise<ToggleResult> {
  const userId = await requireExistingUserId();
  if (!userId) return { ok: false, error: "Sign in to favorite decks." };
  const urlhash = String(deck?.urlhash ?? "");
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(urlhash)) return { ok: false, error: "That deck couldn't be saved." };

  const existing = await db.favorite.findUnique({
    where: { userId_edhrecUrlhash: { userId, edhrecUrlhash: urlhash } },
  });

  if (existing) {
    await db.favorite.delete({ where: { id: existing.id } });
    revalidatePath("/decks");
    return { ok: true, favorited: false };
  }

  const snapshot = JSON.stringify({ deck, commanderName: String(commanderName ?? "").slice(0, 150), source });
  if (snapshot.length > 20000) return { ok: false, error: "That deck couldn't be saved." };
  if ((await db.favorite.count({ where: { userId } })) >= 500) return { ok: false, error: "You have 500 favorites already. Remove some first." };
  await db.favorite.create({
    data: {
      userId,
      edhrecUrlhash: urlhash,
      snapshot: snapshot,
    },
  });
  revalidatePath("/decks");
  return { ok: true, favorited: true };
}

export interface FavoritedKeys {
  deckIds: string[];
  urlhashes: string[];
}

// The current user's favorited-item keys, so cards can render their heart as filled without a
// per-card round trip. Keys are compared against the same "site-<id>" / "edhrec-<urlhash>" shape
// the feed already uses for React keys.
export async function getFavoritedKeys(): Promise<FavoritedKeys> {
  const session = await auth();
  if (!session?.user?.id) return { deckIds: [], urlhashes: [] };

  const favorites = await db.favorite.findMany({
    where: { userId: session.user.id },
    select: { deckId: true, edhrecUrlhash: true },
  });

  return {
    deckIds: favorites.map((f) => f.deckId).filter((id): id is string => Boolean(id)),
    urlhashes: favorites.map((f) => f.edhrecUrlhash).filter((h): h is string => Boolean(h)),
  };
}

export interface FavoritesPage {
  items: MixedDeckItem[];
  commanderImages: Record<string, string | undefined>;
}

export async function getMyFavorites(): Promise<FavoritesPage> {
  const session = await auth();
  if (!session?.user?.id) return { items: [], commanderImages: {} };

  const favorites = await db.favorite.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      deck: { include: { owner: { select: { name: true } } } },
    },
  });

  const items: MixedDeckItem[] = [];
  const commanderNames = new Set<string>();

  for (const f of favorites) {
    // A deck its owner made private since you favorited it is no longer shown.
    if (f.deck && !f.deck.isPublic && f.deck.ownerId !== session.user.id) continue;
    if (f.deck) {
      const row: SiteDeckRow = {
        id: f.deck.id,
        name: f.deck.name,
        commanderName: f.deck.commanderName,
        commanderData: f.deck.commanderData,
        cards: f.deck.cards,
        ownerId: f.deck.ownerId,
        owner: f.deck.owner,
        updatedAt: f.deck.updatedAt.toISOString(),
      };
      items.push({ kind: "site", deck: row });
      commanderNames.add(f.deck.commanderName);
    } else if (f.snapshot) {
      try {
        const parsed = JSON.parse(f.snapshot) as {
          deck: EdhrecPublicDeck;
          commanderName: string;
          source: EdhrecDeckSource | null;
        };
        items.push({ kind: "edhrec", deck: parsed.deck, commanderName: parsed.commanderName, source: parsed.source });
        commanderNames.add(parsed.commanderName);
      } catch {
        // corrupt snapshot — skip rather than break the whole favorites list
      }
    }
  }

  const scryfallCards = commanderNames.size > 0 ? await getCardsByNames(Array.from(commanderNames)) : [];
  const commanderImages: Record<string, string | undefined> = {};
  for (const c of scryfallCards) commanderImages[c.name] = cardImage(c);

  return { items, commanderImages };
}
