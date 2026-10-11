"use server";

import { getCardsByNames, sfetch, type ScryfallCard } from "@/lib/scryfall";
import { scryfallCardToDeckCard, type DeckCard } from "@/lib/deckTypes";
import { parseDecklist, MAX_IMPORT_CHARS, type ListLine, type ParsedList } from "@/lib/decklistParse";
import { clientIp, hit } from "@/lib/rateLimit";

export interface ImportedDeck {
  name: string;
  commander: DeckCard;
  partner?: DeckCard;
  companion?: DeckCard;
  cards: DeckCard[];
}

export type ImportResult =
  | { ok: true; deck: ImportedDeck; notFound: string[]; total: number }
  | { ok: false; error: string; pickCommander?: string[] };

const MOXFIELD_HELP =
  "Moxfield doesn't let other sites read its decks. On Moxfield, open the deck, click More → Export → Copy for MTGA (or Copy plain text), then paste the list here.";

// Archidekt decks are public JSON. Private decks answer 404.
async function fromArchidekt(id: string): Promise<ParsedList | string> {
  try {
    const res = await fetch(`https://archidekt.com/api/decks/${id}/`, {
      headers: { "User-Agent": "ManaForge/1.0 (+https://manaforgehub.com)", Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (res.status === 404 || res.status === 403) return "That Archidekt deck is private or doesn't exist. Make it public on Archidekt, or paste its list instead.";
    if (!res.ok) return "Archidekt didn't answer just now. Try again in a minute, or paste the list instead.";
    const j = (await res.json()) as {
      name?: string;
      categories?: { name: string; includedInDeck?: boolean }[];
      cards?: { quantity?: number; categories?: string[] | null; card?: { oracleCard?: { name?: string } } }[];
    };
    const outside = new Set((j.categories ?? []).filter((c) => c.includedInDeck === false).map((c) => c.name));
    const lines: ListLine[] = [];
    for (const c of j.cards ?? []) {
      const name = c.card?.oracleCard?.name?.trim();
      const cats = c.categories ?? [];
      if (!name || cats.some((x) => outside.has(x) && x !== "Commander")) continue;
      const cmd = cats.includes("Commander");
      lines.push({ qty: Math.max(1, Math.min(99, c.quantity ?? 1)), name, section: cmd ? "commander" : "main", marked: cmd });
    }
    return { name: j.name?.slice(0, 80), lines };
  } catch {
    return "Archidekt didn't answer just now. Try again in a minute, or paste the list instead.";
  }
}

function frontType(c: ScryfallCard): string {
  return `${c.type_line} ${c.card_faces?.[0]?.type_line ?? ""}`;
}
function canLead(c: ScryfallCard): boolean {
  const t = frontType(c);
  const text = `${c.oracle_text ?? ""} ${c.card_faces?.[0]?.oracle_text ?? ""}`;
  return /Legendary/.test(t) && (/Creature/.test(t) || /can be your commander/i.test(text));
}
function canPair(c: ScryfallCard): boolean {
  return canLead(c) || /Background/.test(frontType(c));
}

// Reads a pasted decklist or an Archidekt link into a deck. Nothing is saved here: signed-in
// members save it with importGuestDeck, guests keep it in their browser like any guest draft.
export async function readDecklist(input: string, commanderPick?: string): Promise<ImportResult> {
  const raw = typeof input === "string" ? input.slice(0, MAX_IMPORT_CHARS).trim() : "";
  if (!raw) return { ok: false, error: "Paste a decklist or an Archidekt link first." };
  const ip = await clientIp();
  if (!hit(`deck-import:${ip}`, 20, 10 * 60 * 1000)) return { ok: false, error: "That's a lot of imports. Please wait a few minutes and try again." };

  let parsed: ParsedList;
  if (/moxfield\.com\/decks\//i.test(raw)) return { ok: false, error: MOXFIELD_HELP };
  const arch = raw.match(/archidekt\.com\/(?:api\/)?decks\/(\d+)/i);
  if (arch && raw.split(/\s+/).length <= 3) {
    const r = await fromArchidekt(arch[1]);
    if (typeof r === "string") return { ok: false, error: r };
    parsed = r;
  } else {
    parsed = parseDecklist(raw);
  }
  if (parsed.lines.length === 0) return { ok: false, error: "Couldn't find any cards in that. Paste one card per line, like \"1 Sol Ring\"." };

  // One entry per card name, quantities added up.
  const merged = new Map<string, ListLine>();
  for (const l of parsed.lines) {
    const key = l.name.toLowerCase();
    const prev = merged.get(key);
    if (prev) {
      prev.qty = Math.min(99, prev.qty + l.qty);
      prev.marked ||= l.marked;
      if (l.section === "commander") prev.section = "commander";
    } else merged.set(key, { ...l });
  }
  if (merged.size > 250) return { ok: false, error: "That list has more than 250 different cards. A Commander deck has 100." };

  const found = await getCardsByNames([...merged.values()].map((l) => l.name));
  if (found.length === 0) return { ok: false, error: "Scryfall (our card database) didn't answer. Please try again in a minute." };
  const byName = new Map<string, ScryfallCard>();
  const lookup = (n: string) => byName.get(n.toLowerCase()) ?? byName.get(n.split(" // ")[0].toLowerCase());

  const add = (cs: ScryfallCard[]) => {
    for (const c of cs) {
      byName.set(c.name.toLowerCase(), c);
      for (const f of c.card_faces ?? []) if (!byName.has(f.name.toLowerCase())) byName.set(f.name.toLowerCase(), c);
    }
  };
  add(found);
  // Second try for split and double-faced cards written as "Front // Back": ask for the front face.
  const missing = () => [...merged.values()].filter((l) => !lookup(l.name)).map((l) => l.name);
  const fronts = missing().filter((n) => n.includes(" // ")).map((n) => n.split(" // ")[0]);
  if (fronts.length) add(await getCardsByNames(fronts));
  // Last try for typos: Scryfall's fuzzy match, one card at a time (a few at most).
  const fuzzy = new Map<string, ScryfallCard>();
  for (const n of missing().slice(0, 8)) {
    try {
      const res = await sfetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(n.split(" // ")[0])}`, {
        headers: { "User-Agent": "mtg-hub/1.0", Accept: "application/json" },
      });
      if (res.ok) fuzzy.set(n.toLowerCase(), (await res.json()) as ScryfallCard);
    } catch {
      /* leave it in the not-found list */
    }
    await new Promise((r) => setTimeout(r, 110));
  }

  const entries: { line: ListLine; card: ScryfallCard }[] = [];
  const notFound: string[] = [];
  const seen = new Map<string, { line: ListLine; card: ScryfallCard }>();
  for (const l of merged.values()) {
    const card = lookup(l.name) ?? fuzzy.get(l.name.toLowerCase());
    if (!card) {
      notFound.push(l.name);
      continue;
    }
    const prev = seen.get(card.name);
    if (!prev) {
      const e = { line: l, card };
      seen.set(card.name, e);
      entries.push(e);
    } else {
      // The same card written twice (a typo matched to a card already listed): keep one, and keep
      // its commander mark if either line had it.
      if (l.section !== "main") prev.line.section = l.section;
      prev.line.marked ||= l.marked;
    }
  }

  // Who leads the deck: an explicit Commander section or tag, else the short last block of an
  // MTGO export, else the visitor picks from the legendary creatures in the list.
  let leaders = entries.filter((e) => e.line.section === "commander" || e.line.marked);
  if (leaders.length === 0) leaders = entries.filter((e) => e.line.section === "tail" && canPair(e.card));
  if (commanderPick) {
    const pick = entries.find((e) => e.card.name === commanderPick);
    if (pick) leaders = [pick];
  }
  if (leaders.length === 0 || !canLead(leaders[0].card)) {
    const options = entries.filter((e) => canLead(e.card)).map((e) => e.card.name).slice(0, 40);
    if (options.length === 0) return { ok: false, error: "There's no legendary creature in that list to be the commander. Add your commander as a line and try again." };
    return { ok: false, error: "Which card is your commander?", pickCommander: options };
  }
  const [lead, second] = leaders;
  const partner = second && canPair(second.card) ? second : undefined;
  const companionEntry = !partner ? entries.find((e) => e.line.section === "companion") : undefined;
  const special = new Set([lead, partner, companionEntry].filter(Boolean));

  const cards = entries.filter((e) => !special.has(e)).map((e) => scryfallCardToDeckCard(e.card, e.line.qty));
  const total = 1 + (partner ? 1 : 0) + cards.reduce((n, c) => n + c.quantity, 0);
  return {
    ok: true,
    total,
    notFound: notFound.slice(0, 30),
    deck: {
      name: parsed.name || `${lead.card.name} (imported)`,
      commander: scryfallCardToDeckCard(lead.card, 1),
      ...(partner ? { partner: scryfallCardToDeckCard(partner.card, 1) } : {}),
      ...(companionEntry ? { companion: scryfallCardToDeckCard(companionEntry.card, 1) } : {}),
      cards,
    },
  };
}
