"use server";

import { searchCards, getCardsByNames, type ScryfallCard } from "@/lib/scryfall";
import {
  extractPartnerWithName,
  partnerCandidateQuery,
  type PartnerKind,
} from "@/lib/partnerMechanics";
import { scryfallCardToDeckCard, type DeckCard } from "@/lib/deckTypes";
import { clientIp, hit } from "@/lib/rateLimit";

export interface CommandersPage {
  cards: ScryfallCard[];
  hasMore: boolean;
  nextPage: number;
  // Only populated for cards with a specific "Partner with X" pairing — name -> the partner
  // card, so the feed can render both halves of the pair as one stacked tile and the "+" can
  // select the pair together.
  partnerCards: Record<string, DeckCard>;
}

// The cards a given commander can legally pair with (all of one pairing kind), most-played first,
// optionally narrowed by a name search — powers the "pick a partner" step on the "+" button.
export async function searchPartnerCandidates(
  kind: PartnerKind,
  excludeName: string,
  nameQuery?: string
): Promise<DeckCard[]> {
  try {
    if (!hit(`search:${await clientIp()}`, 60, 60 * 1000)) return [];
    nameQuery = nameQuery === undefined ? undefined : String(nameQuery).slice(0, 100);
    excludeName = String(excludeName ?? "").slice(0, 150);
    const term = nameQuery?.trim().replace(/["\\]/g, "");
    const query = `${partnerCandidateQuery(kind)} -!"${excludeName.replace(/["\\]/g, "")}"${
      term ? ` name:"${term}"` : ""
    }`;
    const result = await searchCards(query, { page: 1 });
    return (result.data ?? []).slice(0, 30).map((c) => scryfallCardToDeckCard(c));
  } catch {
    return [];
  }
}

export async function searchCommandersPage(query: string, page: number): Promise<CommandersPage> {
  try {
    // Every search goes to Scryfall, so keep it to a sensible pace per visitor.
    if (!hit(`search:${await clientIp()}`, 60, 60 * 1000)) return { cards: [], hasMore: false, nextPage: page, partnerCards: {} };
    query = String(query ?? "").slice(0, 300);
    page = Math.min(100, Math.max(1, Math.floor(Number(page)) || 1));
    const result = await searchCards(query, { page });
    const cards = result.data ?? [];

    const partnerNames = Array.from(
      new Set(cards.map((c) => extractPartnerWithName(c)).filter((n): n is string => !!n))
    );
    const partnerCards: Record<string, DeckCard> = {};
    if (partnerNames.length > 0) {
      for (const pc of await getCardsByNames(partnerNames)) {
        partnerCards[pc.name] = scryfallCardToDeckCard(pc);
      }
    }

    return {
      cards,
      hasMore: result.has_more ?? false,
      nextPage: page + 1,
      partnerCards,
    };
  } catch {
    return { cards: [], hasMore: false, nextPage: page, partnerCards: {} };
  }
}
