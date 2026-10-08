export type ScryfallColor = "W" | "U" | "B" | "R" | "G";

export interface ScryfallCard {
  id: string;
  oracle_id: string;
  name: string;
  mana_cost?: string;
  cmc: number;
  type_line: string;
  oracle_text?: string;
  power?: string;
  toughness?: string;
  keywords?: string[];
  color_identity: ScryfallColor[];
  legalities: Record<string, string>;
  image_uris?: {
    small: string;
    normal: string;
    large: string;
    art_crop: string;
    border_crop: string;
  };
  card_faces?: Array<{
    name: string;
    type_line?: string;
    oracle_text?: string;
    power?: string;
    toughness?: string;
    artist?: string;
    image_uris?: ScryfallCard["image_uris"];
  }>;
  edhrec_rank?: number;
  scryfall_uri: string;
  set_name: string;
  artist?: string;
  prices?: {
    usd?: string | null;
    usd_foil?: string | null;
    usd_etched?: string | null;
    eur?: string | null;
    tix?: string | null;
  };
}

export function cardPriceUsd(card: ScryfallCard): number | null {
  const raw = card.prices?.usd ?? card.prices?.usd_foil;
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

interface ScryfallSearchResponse {
  object: "list" | "error";
  total_cards?: number;
  has_more?: boolean;
  next_page?: string;
  data: ScryfallCard[];
  details?: string;
}

const SCRYFALL_API = process.env.SCRYFALL_API_URL || "https://api.scryfall.com"; // server-side override only for testing

export function cardImage(card: ScryfallCard): string | undefined {
  return (
    card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal
  );
}

export function cardArtist(card: ScryfallCard): string | undefined {
  return card.artist ?? card.card_faces?.[0]?.artist;
}

// Only true double-faced cards (transform, modal DFC, meld) have a separate back-face image to
// flip to — split/adventure/fuse cards also have `card_faces`, but both halves live on one
// combined image (`image_uris` is still present at the top level for those), so they're excluded.
export function cardBackImage(card: ScryfallCard): string | undefined {
  if (card.image_uris) return undefined;
  return card.card_faces?.[1]?.image_uris?.normal;
}

// Many tokens share the exact same name (e.g. a dozen different "Zombie" creature tokens with
// different power/toughness or abilities), so the name alone doesn't tell printings apart the
// way it does for ordinary singleton cards — this surfaces the actual game-text differences.
export function cardDistinguishingText(card: ScryfallCard): string | undefined {
  const face = card.image_uris ? card : card.card_faces?.[0];
  if (!face) return undefined;
  const pt = face.power !== undefined && face.toughness !== undefined ? `${face.power}/${face.toughness}` : undefined;
  const keywords = card.keywords && card.keywords.length > 0 ? card.keywords.join(", ") : undefined;
  const text = keywords ?? face.oracle_text;
  return [pt, text].filter(Boolean).join(" — ") || undefined;
}

export function cardImageForPrint(card: ScryfallCard): string | undefined {
  return (
    card.image_uris?.border_crop ??
    card.card_faces?.[0]?.image_uris?.border_crop ??
    cardImage(card)
  );
}

export async function searchCards(
  query: string,
  opts: { order?: string; dir?: "asc" | "desc"; page?: number; unique?: "cards" | "art" | "prints" } = {}
): Promise<ScryfallSearchResponse> {
  const params = new URLSearchParams({
    q: query,
    order: opts.order ?? "edhrec",
    dir: opts.dir ?? "asc",
    page: String(opts.page ?? 1),
    unique: opts.unique ?? "cards",
  });

  const res = await fetch(`${SCRYFALL_API}/cards/search?${params}`, {
    headers: { "User-Agent": "mtg-hub/1.0", Accept: "application/json" },
    next: { revalidate: 3600 },
  });

  if (res.status === 404) {
    return { object: "list", data: [], has_more: false, total_cards: 0 };
  }

  if (!res.ok) {
    throw new Error(`Scryfall search failed: ${res.status}`);
  }

  return res.json();
}

export async function autocompleteCardNames(query: string): Promise<string[]> {
  if (!query.trim()) return [];
  const res = await fetch(
    `${SCRYFALL_API}/cards/autocomplete?q=${encodeURIComponent(query)}`
  );
  if (!res.ok) return [];
  const json = await res.json();
  return json.data ?? [];
}

export async function autocompleteCommanderNames(query: string): Promise<string[]> {
  if (!query.trim()) return [];
  const result = await searchCards(`is:commander name:/${query}/`, { page: 1 });
  return result.data.map((c) => c.name).slice(0, 20);
}

export async function autocompleteTokenNames(query: string): Promise<string[]> {
  if (!query.trim()) return [];
  const result = await searchCards(`t:token name:/${query}/`, { page: 1 });
  return result.data.map((c) => c.name).slice(0, 20);
}

export async function getCardsByNames(names: string[]): Promise<ScryfallCard[]> {
  if (names.length === 0) return [];
  const results: ScryfallCard[] = [];
  for (let i = 0; i < names.length; i += 75) {
    const batch = names.slice(i, i + 75);
    const res = await fetch(`${SCRYFALL_API}/cards/collection`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "mtg-hub/1.0",
      },
      body: JSON.stringify({ identifiers: batch.map((name) => ({ name })) }),
      next: { revalidate: 3600 },
    });
    if (!res.ok) continue;
    const json = await res.json();
    results.push(...(json.data ?? []));
  }
  return results;
}

export async function getAllPrintings(name: string): Promise<ScryfallCard[]> {
  // Scryfall's search excludes tokens (and other "extras") by default, so a token name would
  // otherwise come back with zero printings here even though it's a real, findable card.
  const result = await searchCards(`!"${name}" include:extras`, {
    unique: "prints",
    order: "released",
    dir: "desc",
  });
  return result.data ?? [];
}

export interface ScryfallSet {
  code: string;
  name: string;
  set_type: string;
  released_at?: string;
  card_count: number;
  icon_svg_uri: string;
}

const EXCLUDED_SET_TYPES = new Set(["token", "memorabilia", "minigame"]);

export async function getCommanderSets(): Promise<ScryfallSet[]> {
  const res = await fetch(`${SCRYFALL_API}/sets`, {
    headers: { "User-Agent": "mtg-hub/1.0", Accept: "application/json" },
    next: { revalidate: 86400 },
  });
  if (!res.ok) return [];
  const json = await res.json();
  const sets: ScryfallSet[] = json.data ?? [];
  return sets
    .filter((s) => s.card_count > 20 && !EXCLUDED_SET_TYPES.has(s.set_type) && s.released_at)
    .sort((a, b) => (b.released_at ?? "").localeCompare(a.released_at ?? ""));
}

export async function getCardByName(name: string): Promise<ScryfallCard | null> {
  const res = await fetch(
    `${SCRYFALL_API}/cards/named?exact=${encodeURIComponent(name)}`,
    { headers: { "User-Agent": "mtg-hub/1.0", Accept: "application/json" }, next: { revalidate: 3600 } }
  );
  if (!res.ok) return null;
  return res.json();
}
