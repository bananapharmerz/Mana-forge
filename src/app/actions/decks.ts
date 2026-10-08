"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { deckLimitFor } from "@/lib/tier";
import { cardImage, getCardByName, getCardsByNames } from "@/lib/scryfall";
import { extractPartnerWithName } from "@/lib/partnerMechanics";
import { findCategory, commandersMatchingCategory } from "@/lib/categories";
import type { DeckCard } from "@/lib/deckTypes";
import { cleanCardBack, cleanDeckCard, cleanDeckCards, text } from "@/lib/validate";
import { hit } from "@/lib/rateLimit";

const CARD_BACK_PRESETS = ["classic", "crimson", "emerald", "amethyst", "obsidian", "sunburst"] as const;
const TOO_FAST = "You're doing that a lot. Please wait a minute and try again.";
// Creating decks is capped per account so nobody can flood the database.
const canCreate = (userId: string) => hit(`deck-create:${userId}`, 30, 60 * 60 * 1000);

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not signed in.");
  return session.user.id;
}

// Cards picked one at a time from the Commanders grid and commander detail pages (via the "+"
// selection tray) get saved here. The first legendary-creature-shaped card in the selection
// becomes the commander; everything else becomes the starting card pool.
export async function saveSelectedCardsAsDeck(
  cards: DeckCard[],
  // Cards the player picked together as two commanders (named "Partner with" pairs, or a partner
  // chosen in the picker), as [scryfallId, scryfallId]. The pair becomes the deck's two commanders.
  pairs: [string, string][] = [],
  // Cards picked from the Companion tab. A companion never takes the commander's place (unless it's
  // the only legendary creature selected), and a deck with a partner can't also have a companion.
  companionIds: string[] = []
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Sign in to save decks to your account." };
  if (!canCreate(session.user.id)) return { ok: false, error: TOO_FAST };

  const cleaned = cleanDeckCards(cards);
  if (!cleaned) return { ok: false, error: "That's too many cards for one deck." };
  cards = cleaned;
  pairs = (Array.isArray(pairs) ? pairs : [])
    .slice(0, 10)
    .filter((p): p is [string, string] => Array.isArray(p) && typeof p[0] === "string" && typeof p[1] === "string");
  companionIds = (Array.isArray(companionIds) ? companionIds : []).slice(0, 10).map(String);

  if (cards.length === 0) return { ok: false, error: "Nothing selected." };

  const isCommanderType = (c: DeckCard) =>
    /legendary/i.test(c.typeLine) && (/creature/i.test(c.typeLine) || /planeswalker/i.test(c.typeLine));

  let commander: DeckCard | undefined;
  let partner: DeckCard | undefined;
  let companion = cards.find((c) => companionIds.includes(c.scryfallId));

  const byId = new Map(cards.map((c) => [c.scryfallId, c]));
  for (const [idA, idB] of pairs) {
    const a = byId.get(idA);
    const b = byId.get(idB);
    if (!a || !b) continue;
    // Pair order is [the card whose "+" was clicked, the partner picked for it]; a Background (not
    // a legendary creature) can only ever be the second half.
    const [first, second] = isCommanderType(a) || !isCommanderType(b) ? [a, b] : [b, a];
    commander = first;
    partner = second;
    break;
  }

  if (!commander) {
    // The companion is never picked as the commander while another legendary card is available.
    const commanderIndex = cards.findIndex((c) => c !== companion && isCommanderType(c));
    if (commanderIndex !== -1) {
      commander = cards[commanderIndex];
    } else if (companion && isCommanderType(companion)) {
      // Companions are all legendary creatures, so a lone one can still lead its own deck.
      commander = companion;
      companion = undefined;
    } else {
      return { ok: false, error: "Select a legendary creature or planeswalker to use as your commander." };
    }

    // Fallback for a "Partner with X" pair that arrives without pair info: if the commander's own
    // text names a card that's also in the selection, that card is the second commander.
    const commanderCard = await getCardByName(commander.name);
    const partnerName = commanderCard ? extractPartnerWithName(commanderCard) : null;
    if (partnerName) partner = cards.find((c) => c !== commander && c.name === partnerName);
  }

  // A deck gets one extra command-zone card: a partner takes the slot, so a companion picked
  // alongside one stays in the card pool instead.
  if (partner) companion = undefined;
  const used = new Set<DeckCard | undefined>([commander, partner, companion]);
  const rest = cards.filter((c) => !used.has(c));

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user) return { ok: false, error: "Account not found." };

  const count = await db.deck.count({ where: { ownerId: session.user.id } });
  const limit = deckLimitFor(user.tier);
  if (count >= limit) {
    return {
      ok: false,
      error: `Free accounts are limited to ${limit} decks. Delete one or upgrade to Premium for unlimited decks.`,
    };
  }

  const deck = await db.deck.create({
    data: {
      name: partner
        ? `${commander.name} & ${partner.name} Commander Deck`
        : `${commander.name} Commander Deck`,
      commanderName: commander.name,
      commanderData: JSON.stringify({ ...commander, quantity: 1 }),
      ...(partner
        ? {
            partnerCommanderName: partner.name,
            partnerCommanderData: JSON.stringify({ ...partner, quantity: 1 }),
          }
        : {}),
      ...(companion
        ? {
            companionName: companion.name,
            companionData: JSON.stringify({ ...companion, quantity: 1 }),
          }
        : {}),
      cards: JSON.stringify(rest),
      ownerId: session.user.id,
      isPublic: false,
    },
  });

  revalidatePath("/deck-builder");
  return { ok: true, id: deck.id };
}

export interface PlayCardRef {
  scryfallId: string;
  name: string;
  imageUrl?: string;
  backImageUrl?: string;
}

export interface DeckForPlay {
  id: string;
  name: string;
  commanderName: string;
  commanderCard?: PlayCardRef;
  partnerCommanderCard?: PlayCardRef;
  companionCard?: PlayCardRef;
  cardBackUrl?: string | null;
  cards: PlayCardRef[];
  tokenCards: PlayCardRef[];
}

export async function listMyDecksForPlay(): Promise<DeckForPlay[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const rows = await db.deck.findMany({
    where: { ownerId: session.user.id },
    orderBy: { updatedAt: "desc" },
  });

  return rows.map((row) => {
    const commander = JSON.parse(row.commanderData) as DeckCard;
    const cards = JSON.parse(row.cards) as DeckCard[];
    // The commander is kept out of this flattened list — it goes to the command zone instead
    // of being shuffled anonymously into the library. Tokens are kept out too — they're already
    // summonable on demand from tokenCards below, so including them here would double them up.
    const flat = cards
      .filter((c) => c.category !== "Tokens")
      .flatMap((c) =>
        Array.from({ length: c.quantity }, () => ({
          scryfallId: c.scryfallId,
          name: c.name,
          imageUrl: c.imageUrl,
          backImageUrl: c.backImageUrl,
        }))
      );
    // One entry per distinct token — they're summoned on demand rather than drawn from the
    // library, so quantity doesn't apply the way it does for the rest of the deck.
    const tokenCards = cards
      .filter((c) => c.category === "Tokens")
      .map((c) => ({
        scryfallId: c.scryfallId,
        name: c.name,
        imageUrl: c.imageUrl,
        backImageUrl: c.backImageUrl,
      }));
    const partner = row.partnerCommanderData ? (JSON.parse(row.partnerCommanderData) as DeckCard) : null;
    const companion = row.companionData ? (JSON.parse(row.companionData) as DeckCard) : null;
    return {
      id: row.id,
      name: row.name,
      commanderCard: {
        scryfallId: commander.scryfallId,
        name: commander.name,
        imageUrl: commander.imageUrl,
        backImageUrl: commander.backImageUrl,
      },
      partnerCommanderCard: partner
        ? {
            scryfallId: partner.scryfallId,
            name: partner.name,
            imageUrl: partner.imageUrl,
            backImageUrl: partner.backImageUrl,
          }
        : undefined,
      companionCard: companion
        ? {
            scryfallId: companion.scryfallId,
            name: companion.name,
            imageUrl: companion.imageUrl,
            backImageUrl: companion.backImageUrl,
          }
        : undefined,
      commanderName: row.commanderName,
      cardBackUrl: row.cardBackUrl,
      cards: flat,
      tokenCards,
    };
  });
}

export async function createDeck(
  commander: DeckCard,
  name?: string
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const userId = await requireUserId();
  if (!canCreate(userId)) return { ok: false, error: TOO_FAST };
  const cleanCommander = cleanDeckCard(commander);
  if (!cleanCommander) return { ok: false, error: "That commander couldn't be read. Please try again." };
  commander = cleanCommander;

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, error: "Account not found." };

  const count = await db.deck.count({ where: { ownerId: userId } });
  const limit = deckLimitFor(user.tier);
  if (count >= limit) {
    return {
      ok: false,
      error: `Free accounts are limited to ${limit} decks. Delete one or upgrade to Premium for unlimited decks.`,
    };
  }

  const deck = await db.deck.create({
    data: {
      name: text(name, 80) || `${commander.name} Commander Deck`,
      commanderName: commander.name,
      commanderData: JSON.stringify(commander),
      cards: JSON.stringify([]),
      ownerId: userId,
    },
  });

  revalidatePath("/deck-builder");
  return { ok: true, id: deck.id };
}

export async function updateDeckCards(deckId: string, cards: DeckCard[]) {
  const userId = await requireUserId();
  const deck = await db.deck.findUnique({ where: { id: deckId } });
  if (!deck || deck.ownerId !== userId) throw new Error("Deck not found.");
  const clean = cleanDeckCards(cards);
  if (!clean) throw new Error("That's too many cards for one deck.");

  await db.deck.update({
    where: { id: deckId },
    data: { cards: JSON.stringify(clean) },
  });
}

export async function updateDeckCardBack(deckId: string, cardBackUrl: string) {
  const userId = await requireUserId();
  const deck = await db.deck.findUnique({ where: { id: deckId } });
  if (!deck || deck.ownerId !== userId) throw new Error("Deck not found.");
  const back = cleanCardBack(cardBackUrl, CARD_BACK_PRESETS);
  if (!back) throw new Error("That card back image isn't supported. Use a PNG, JPEG or WebP under 2 MB.");

  await db.deck.update({ where: { id: deckId }, data: { cardBackUrl: back } });
}

// A deck can have a partner (second commander) or a companion, never both — picking one clears
// the other, matching the real rule that they occupy the same "second command-zone card" slot.
export async function updateDeckPartner(deckId: string, partner: DeckCard | null) {
  const userId = await requireUserId();
  const deck = await db.deck.findUnique({ where: { id: deckId } });
  if (!deck || deck.ownerId !== userId) throw new Error("Deck not found.");
  partner = partner ? cleanDeckCard(partner) : null;

  await db.deck.update({
    where: { id: deckId },
    data: {
      partnerCommanderName: partner?.name ?? null,
      partnerCommanderData: partner ? JSON.stringify(partner) : null,
      ...(partner ? { companionName: null, companionData: null } : {}),
    },
  });
  revalidatePath(`/deck-builder/${deckId}`);
}

export async function updateDeckCompanion(deckId: string, companion: DeckCard | null) {
  const userId = await requireUserId();
  const deck = await db.deck.findUnique({ where: { id: deckId } });
  if (!deck || deck.ownerId !== userId) throw new Error("Deck not found.");
  companion = companion ? cleanDeckCard(companion) : null;

  await db.deck.update({
    where: { id: deckId },
    data: {
      companionName: companion?.name ?? null,
      companionData: companion ? JSON.stringify(companion) : null,
      ...(companion ? { partnerCommanderName: null, partnerCommanderData: null } : {}),
    },
  });
  revalidatePath(`/deck-builder/${deckId}`);
}

export async function updateDeckName(deckId: string, name: string) {
  const userId = await requireUserId();
  const deck = await db.deck.findUnique({ where: { id: deckId } });
  if (!deck || deck.ownerId !== userId) throw new Error("Deck not found.");

  await db.deck.update({
    where: { id: deckId },
    data: { name: text(name, 80) || deck.name },
  });
  revalidatePath("/deck-builder");
}

export async function setDeckPublic(deckId: string, isPublic: boolean) {
  const userId = await requireUserId();
  const deck = await db.deck.findUnique({ where: { id: deckId } });
  if (!deck || deck.ownerId !== userId) throw new Error("Deck not found.");

  await db.deck.update({ where: { id: deckId }, data: { isPublic } });
  revalidatePath("/deck-builder");
  revalidatePath(`/decks/${encodeURIComponent(deck.commanderName)}`);
  revalidatePath("/decks");
}

export interface SiteDeckRow {
  id: string;
  name: string;
  commanderName: string;
  commanderData: string;
  cards: string;
  ownerId: string;
  owner: { name: string | null };
  updatedAt: string;
}

export interface PublicDecksPage {
  decks: SiteDeckRow[];
  commanderImages: Record<string, string | undefined>;
  hasMore: boolean;
  nextCursor: string | null;
}

export interface PublicDecksFilter {
  commanderNames?: string[];
  q?: string;
}

// Every public deck, newest-published-first — "published" here means most recently made
// public or edited (setDeckPublic and updateDeckCards both bump updatedAt), so a deck jumps
// to the top the moment someone publishes or updates it.
//
// Cursor-based (not offset/skip) on purpose: OFFSET pagination makes the database walk and
// discard every row before the offset, so it gets linearly slower as the deck count grows and
// the "infinite" feed page gets further in. A cursor keyed on the last-seen deck id costs the
// same regardless of how deep the feed goes or how many decks exist site-wide. `updatedAt` alone
// isn't unique enough to order by safely (two decks can share a timestamp), so `id` is a
// tiebreaker in the sort and the actual cursor field.
export async function getPublicDecksPage(
  cursor: string | null,
  limit: number,
  filters?: PublicDecksFilter
): Promise<PublicDecksPage> {
  const commanderNameFilter: { in?: string[]; contains?: string } = {};
  if (filters?.commanderNames) commanderNameFilter.in = filters.commanderNames;
  if (filters?.q) commanderNameFilter.contains = filters.q;

  const rows = await db.deck.findMany({
    where: {
      isPublic: true,
      ...(Object.keys(commanderNameFilter).length > 0 ? { commanderName: commanderNameFilter } : {}),
    },
    include: { owner: { select: { name: true } } },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > limit;
  const pageRows = rows.slice(0, limit);
  const lastRow = pageRows[pageRows.length - 1];

  const names = Array.from(new Set(pageRows.map((r) => r.commanderName)));
  const scryfallCards = names.length > 0 ? await getCardsByNames(names) : [];
  const commanderImages: Record<string, string | undefined> = {};
  for (const c of scryfallCards) commanderImages[c.name] = cardImage(c);

  return {
    decks: pageRows.map((r) => ({
      id: r.id,
      name: r.name,
      commanderName: r.commanderName,
      commanderData: r.commanderData,
      cards: r.cards,
      ownerId: r.ownerId,
      owner: r.owner,
      updatedAt: r.updatedAt.toISOString(),
    })),
    commanderImages,
    hasMore,
    nextCursor: hasMore && lastRow ? lastRow.id : null,
  };
}

export type MixedDeckItem =
  | { kind: "site"; deck: SiteDeckRow }
  | {
      kind: "edhrec";
      deck: import("@/lib/edhrec").EdhrecPublicDeck;
      commanderName: string;
      source: import("@/lib/edhrec").EdhrecDeckSource | null;
    };

export interface MixedDecksPage {
  items: MixedDeckItem[];
  commanderImages: Record<string, string | undefined>;
  hasMore: boolean;
  nextSiteCursor: string | null;
  siteExhausted: boolean;
}

const SITE_DECKS_PER_BATCH = 6;
const EDHREC_COMMANDERS_PER_BATCH = 6;
const EDHREC_DECKS_PER_COMMANDER = 4;

export interface MixedDecksFilter {
  category?: string;
  q?: string;
}

// Every public deck on the site (real, cursor-paginated, newest first) plus a fresh random
// sample of real EDHREC decks, mixed into one feed. "hasMore" is true whenever there are more
// real site decks OR this batch found any EDHREC decks (which is effectively always, since
// EDHREC sampling never runs out) — it only goes false once a filter genuinely has nothing
// left to show on either side.
//
// `siteExhausted` disambiguates the two things a null cursor can mean once site decks run out:
// "haven't started yet" (first call) vs. "already reached the end" (later calls). Without it,
// a null `nextSiteCursor` on an exhausted feed would look identical to a fresh start and every
// subsequent Load More would silently restart the site-deck list from page one.
export async function getMixedDecksPage(
  siteCursor: string | null,
  siteExhausted: boolean,
  filters?: MixedDecksFilter
): Promise<MixedDecksPage> {
  const { POPULAR_COMMANDERS, shuffled, seededShuffle, edhrecDecksCached, getEdhrecPublicDecks, getEdhrecDeckSource } = await import(
    "@/lib/edhrec"
  );

  const q = filters?.q?.trim() || undefined;
  const category = filters?.category ? findCategory(filters.category) : undefined;

  let edhrecPool = POPULAR_COMMANDERS;
  if (q) {
    const qLower = q.toLowerCase();
    edhrecPool = edhrecPool.filter((n) => n.toLowerCase().includes(qLower));
  }
  if (category) {
    const matched = await commandersMatchingCategory(edhrecPool, category);
    edhrecPool = edhrecPool.filter((n) => matched.has(n));
  }
  // The first page picks from this hour's set of commanders (the same for every visitor), so their
  // EDHREC data is usually already in memory; later pages roam the whole pool. Commanders that are
  // already loaded go first, so a page rarely waits on EDHREC at all.
  const firstPage = siteCursor === null && !siteExhausted;
  const pool = firstPage ? seededShuffle(edhrecPool, Math.floor(Date.now() / 3600000)).slice(0, 12) : edhrecPool;
  const mixed = shuffled(pool);
  const chosenCommanders = [...mixed.filter((n) => edhrecDecksCached(n)), ...mixed.filter((n) => !edhrecDecksCached(n))].slice(
    0,
    EDHREC_COMMANDERS_PER_BATCH
  );

  let siteCommanderNames: string[] | undefined;
  if (category) {
    const distinctRows = await db.deck.findMany({
      where: { isPublic: true },
      distinct: ["commanderName"],
      select: { commanderName: true },
    });
    const distinctNames = distinctRows.map((r) => r.commanderName);
    const matched = await commandersMatchingCategory(distinctNames, category);
    siteCommanderNames = distinctNames.filter((n) => matched.has(n));
  }

  const sitePage = siteExhausted
    ? { decks: [] as SiteDeckRow[], commanderImages: {} as Record<string, string | undefined>, hasMore: false, nextCursor: null as string | null }
    : await getPublicDecksPage(siteCursor, SITE_DECKS_PER_BATCH, {
        commanderNames: siteCommanderNames,
        q,
      });
  const nextSiteExhausted = siteExhausted || !sitePage.hasMore;

  // EDHREC gets about a second; whatever isn't ready keeps loading for the next visitor.
  const edhrecResults = await Promise.all(
    chosenCommanders.map(async (name) => ({
      name,
      decks: (await getEdhrecPublicDecks(name, EDHREC_DECKS_PER_COMMANDER, 1200)) ?? [],
    }))
  );
  const withDecks = edhrecResults.filter((r) => r.decks.length);
  const sources = await Promise.all(withDecks.flatMap((r) => r.decks.map((d) => getEdhrecDeckSource(d.urlhash, 700))));
  const edhrecItems: MixedDeckItem[] = [];
  let si = 0;
  for (const r of withDecks) for (const d of r.decks) edhrecItems.push({ kind: "edhrec", deck: d, commanderName: r.name, source: sources[si++] });

  const siteItems: MixedDeckItem[] = sitePage.decks.map((deck) => ({ kind: "site", deck }));

  const shownCommanders = withDecks.map((r) => r.name);
  const extraCommanderCards = shownCommanders.length > 0 ? await getCardsByNames(shownCommanders) : [];
  const commanderImages: Record<string, string | undefined> = { ...sitePage.commanderImages };
  for (const c of extraCommanderCards) commanderImages[c.name] = cardImage(c);

  return {
    items: shuffled([...siteItems, ...edhrecItems]),
    commanderImages,
    hasMore: !nextSiteExhausted || edhrecItems.length > 0,
    nextSiteCursor: nextSiteExhausted ? null : sitePage.nextCursor,
    siteExhausted: nextSiteExhausted,
  };
}

export async function saveDeckCopy(
  sourceDeckId: string
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Sign in to save decks to your account." };
  }

  if (!canCreate(session.user.id)) return { ok: false, error: TOO_FAST };
  const source = await db.deck.findUnique({ where: { id: String(sourceDeckId) } });
  if (!source || !source.isPublic) {
    return { ok: false, error: "That deck isn't available to save." };
  }
  if (source.ownerId === session.user.id) {
    return { ok: false, error: "This is already your deck." };
  }

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user) return { ok: false, error: "Account not found." };

  const count = await db.deck.count({ where: { ownerId: session.user.id } });
  const limit = deckLimitFor(user.tier);
  if (count >= limit) {
    return {
      ok: false,
      error: `Free accounts are limited to ${limit} decks. Delete one or upgrade to Premium for unlimited decks.`,
    };
  }

  const copy = await db.deck.create({
    data: {
      name: source.name,
      commanderName: source.commanderName,
      commanderData: source.commanderData,
      cards: source.cards,
      ownerId: session.user.id,
      isPublic: false,
    },
  });

  revalidatePath("/deck-builder");
  return { ok: true, id: copy.id };
}

// EDHREC only exposes aggregate type counts for its public decks (never real card names), so
// there's no actual decklist to copy. Instead we synthesize one real, plausible 100-card deck
// matching those counts from the commander's real EDHREC card pool — the same technique the
// seed script uses — and save that as a genuine, editable deck.
export async function saveEdhrecDeckCopy(
  deck: import("@/lib/edhrec").EdhrecPublicDeck,
  commanderName: string
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Sign in to save decks to your account." };
  }

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user) return { ok: false, error: "Account not found." };

  const count = await db.deck.count({ where: { ownerId: session.user.id } });
  const limit = deckLimitFor(user.tier);
  if (count >= limit) {
    return {
      ok: false,
      error: `Free accounts are limited to ${limit} decks. Delete one or upgrade to Premium for unlimited decks.`,
    };
  }

  const { buildDeckFromEdhrec } = await import("@/lib/edhrecDeckBuilder");
  const built = await buildDeckFromEdhrec(commanderName, deck);
  if (!built) {
    return { ok: false, error: "Couldn't build a full decklist for this commander right now." };
  }

  const copy = await db.deck.create({
    data: {
      name: `${commanderName} (from EDHREC)`,
      commanderName,
      commanderData: JSON.stringify(built.commander),
      cards: JSON.stringify(built.cards),
      ownerId: session.user.id,
      isPublic: false,
    },
  });

  revalidatePath("/deck-builder");
  return { ok: true, id: copy.id };
}

export async function deleteDeckAction(deckId: string) {
  const userId = await requireUserId();
  const deck = await db.deck.findUnique({ where: { id: deckId } });
  if (!deck || deck.ownerId !== userId) throw new Error("Deck not found.");

  await db.deck.delete({ where: { id: deckId } });
  revalidatePath("/deck-builder");
}

export async function duplicateDeck(
  deckId: string
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const userId = await requireUserId();
  const source = await db.deck.findUnique({ where: { id: deckId } });
  if (!source || source.ownerId !== userId) {
    return { ok: false, error: "Deck not found." };
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, error: "Account not found." };

  const count = await db.deck.count({ where: { ownerId: userId } });
  const limit = deckLimitFor(user.tier);
  if (count >= limit) {
    return {
      ok: false,
      error: `Free accounts are limited to ${limit} decks. Delete one or upgrade to Premium for unlimited decks.`,
    };
  }

  const copy = await db.deck.create({
    data: {
      name: `${source.name} (copy)`,
      commanderName: source.commanderName,
      commanderData: source.commanderData,
      cards: source.cards,
      ownerId: userId,
      isPublic: false,
    },
  });

  revalidatePath("/deck-builder");
  return { ok: true, id: copy.id };
}
