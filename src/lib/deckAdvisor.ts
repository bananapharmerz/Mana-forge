import "server-only";
import {
  getEdhrecCommanderData,
  getMostPlayed,
  getCommanderCombos,
  type EdhrecCardView,
} from "./edhrec";
import { getCardsByNames, cardImage, cardPriceUsd, type ScryfallCard } from "./scryfall";
import { getGameChangers } from "./gameChangers";
import { findAlmostCombos } from "./commanderSpellbook";

// The Deck Doctor "build buddy": given a commander and the cards already in the deck, it surfaces
// (1) combos the deck has nearly assembled — the missing piece, and what the combo does — and
// (2) high-play-rate cards the deck is missing, each with a plain reason. Combos come from
// Commander Spellbook (any combo, not just the commander's), backed up by EDHREC's own combo
// list; synergy and play rates come from EDHREC; prices and art from Scryfall. No LLM.

export interface AdvisorPick {
  name: string;
  imageUrl?: string;
  priceUsd: number | null;
  reason: string;
  playRatePct: number; // 0–100, how often this commander's decks run the card
  gameChanger: boolean;
}

export interface ComboSuggestion {
  add: string; // the missing piece to add
  partners: string[]; // combo pieces already in the deck
  imageUrl?: string;
  priceUsd: number | null;
  reason: string;
  gameChanger: boolean;
}

export interface DeckAdvice {
  commander: string;
  combos: ComboSuggestion[];
  synergy: AdvisorPick[];
}

export interface AdviseOptions {
  have: string[]; // card names already in the deck (commander added automatically)
  maxCardUsd?: number; // when set, only suggest cards at or below this price (unknown price kept)
}

const playRate = (c: EdhrecCardView) => (c.potential_decks > 0 ? c.num_decks / c.potential_decks : 0);
const norm = (s: string) => s.toLowerCase().trim();

export async function adviseDeck(commanderName: string, opts: AdviseOptions): Promise<DeckAdvice | null> {
  const [data, spellbook, gc] = await Promise.all([
    getEdhrecCommanderData(commanderName),
    findAlmostCombos([commanderName], opts.have),
    getGameChangers(),
  ]);

  const max = opts.maxCardUsd;
  const withinBudget = (price: number | null) => max == null || price == null || price <= max;
  const have = new Set<string>([norm(commanderName), ...opts.have.map(norm)]);
  const short = commanderName.split(",")[0];
  const isCmd = (n: string) => norm(n) === norm(commanderName);

  // --- Combo pieces to suggest: Commander Spellbook first, EDHREC combos as a backstop ---
  type Pending = { add: string; partners: string[]; produces: string[]; extraMissing?: string };
  const pending: Pending[] = [];
  const addSeen = new Set<string>();

  // Prefer combos where a non-commander piece is already down — those are the ones the player
  // has visibly started building toward.
  const rankedSb = spellbook
    .slice()
    .sort((a, b) => b.have.filter((p) => !isCmd(p)).length - a.have.filter((p) => !isCmd(p)).length);
  for (const combo of rankedSb) {
    const add = combo.missing[0];
    if (!add || addSeen.has(norm(add))) continue;
    addSeen.add(norm(add));
    pending.push({ add, partners: combo.have, produces: combo.produces, extraMissing: combo.missing[1] });
  }

  if (data) {
    for (const combo of getCommanderCombos(data)) {
      const present = combo.pieces.filter((p) => have.has(norm(p)));
      const missing = combo.pieces.filter((p) => !have.has(norm(p)));
      if (present.length < 1 || missing.length < 1 || missing.length > 2) continue;
      for (const add of missing) {
        if (addSeen.has(norm(add))) continue;
        addSeen.add(norm(add));
        pending.push({ add, partners: present, produces: [] });
      }
    }
  }

  // --- Synergy candidates: most-played nonlands the deck is missing ---
  const mostPlayed = data ? getMostPlayed(data, 150).filter((c) => !have.has(norm(c.name))) : [];

  // Resolve art, prices and game-changer status for everything we might show.
  const synergyNames = mostPlayed.slice(0, 40).map((c) => c.name);
  const comboNames = pending.map((p) => p.add);
  const cards = await getCardsByNames(Array.from(new Set([...synergyNames, ...comboNames])));
  const byName = new Map<string, ScryfallCard>();
  for (const c of cards) byName.set(norm(c.name), c);
  const gameChangers = new Set(gc.names.map(norm));

  // Combo suggestions (most actionable), budget-filtered.
  const combos: ComboSuggestion[] = [];
  for (const pc of pending) {
    const card = byName.get(norm(pc.add));
    const price = card ? cardPriceUsd(card) : null;
    if (!withinBudget(price)) continue;
    const partnerLabel = pc.partners.filter((p) => !isCmd(p)).slice(0, 2).join(" + ") || short;
    const produce = pc.produces[0]?.toLowerCase();
    const reason = pc.extraMissing
      ? `Add ${pc.add} + ${pc.extraMissing} with ${partnerLabel}${produce ? ` for ${produce}` : ""}.`
      : `You run ${partnerLabel} — add ${pc.add}${produce ? ` for ${produce}` : " to complete the combo"}.`;
    combos.push({
      add: pc.add,
      partners: pc.partners,
      imageUrl: card ? cardImage(card) : undefined,
      priceUsd: price,
      reason,
      gameChanger: gameChangers.has(norm(pc.add)),
    });
    if (combos.length >= 8) break;
  }

  // Synergy picks (don't repeat a combo pick).
  const comboAdds = new Set(combos.map((c) => norm(c.add)));
  const synergy: AdvisorPick[] = [];
  for (const cv of mostPlayed) {
    if (comboAdds.has(norm(cv.name))) continue;
    const card = byName.get(norm(cv.name));
    const price = card ? cardPriceUsd(card) : null;
    if (!withinBudget(price)) continue;
    const pct = Math.round(playRate(cv) * 100);
    const reason = cv.synergy >= 0.3 ? `High synergy · in ${pct}% of ${short} decks` : `Played in ${pct}% of ${short} decks`;
    synergy.push({
      name: cv.name,
      imageUrl: card ? cardImage(card) : undefined,
      priceUsd: price,
      reason,
      playRatePct: pct,
      gameChanger: gameChangers.has(norm(cv.name)),
    });
    if (synergy.length >= 12) break;
  }

  if (!data && combos.length === 0) return null;
  return { commander: commanderName, combos, synergy };
}
