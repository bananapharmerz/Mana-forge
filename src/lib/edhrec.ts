export interface EdhrecCardView {
  name: string;
  synergy: number;
  num_decks: number;
  potential_decks: number;
}

export interface EdhrecCardList {
  tag: string;
  header: string;
  cardviews: EdhrecCardView[];
}

export interface EdhrecCommanderData {
  typeCounts: {
    creature: number;
    instant: number;
    sorcery: number;
    artifact: number;
    enchantment: number;
    battle: number;
    planeswalker: number;
    land: number;
  };
  cardlists: EdhrecCardList[];
}

export function edhrecSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function getEdhrecCommanderData(name: string): Promise<EdhrecCommanderData | null> {
  const slug = edhrecSlug(name);
  try {
    const res = await fetch(`https://json.edhrec.com/pages/commanders/${slug}.json`, {
      headers: { "User-Agent": "mtg-hub/1.0", Accept: "application/json" },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const cardlists: EdhrecCardList[] = data?.container?.json_dict?.cardlists ?? [];
    return {
      typeCounts: {
        creature: data.creature ?? 0,
        instant: data.instant ?? 0,
        sorcery: data.sorcery ?? 0,
        artifact: data.artifact ?? 0,
        enchantment: data.enchantment ?? 0,
        battle: data.battle ?? 0,
        planeswalker: data.planeswalker ?? 0,
        land: data.land ?? 0,
      },
      cardlists,
    };
  } catch {
    return null;
  }
}

export function findCardlist(data: EdhrecCommanderData, tag: string): EdhrecCardList | undefined {
  return data.cardlists.find((l) => l.tag === tag);
}

// Mirrors EDHREC's own per-type card lists for this commander, in their real display order.
export const TYPE_SECTION_TAGS: { tag: string; label: string }[] = [
  { tag: "creatures", label: "Creatures" },
  { tag: "instants", label: "Instants" },
  { tag: "sorceries", label: "Sorceries" },
  { tag: "utilityartifacts", label: "Utility Artifacts" },
  { tag: "manaartifacts", label: "Mana Artifacts" },
  { tag: "enchantments", label: "Enchantments" },
  { tag: "planeswalkers", label: "Planeswalkers" },
  { tag: "utilitylands", label: "Utility Lands" },
  { tag: "lands", label: "Lands" },
];

const NONLAND_TAGS = new Set([
  "creatures",
  "instants",
  "sorceries",
  "utilityartifacts",
  "manaartifacts",
  "enchantments",
  "planeswalkers",
]);

export interface TypeSection {
  tag: string;
  label: string;
  cardviews: EdhrecCardView[];
}

export function getTypeSections(data: EdhrecCommanderData): TypeSection[] {
  return TYPE_SECTION_TAGS.map((s) => ({
    ...s,
    cardviews: findCardlist(data, s.tag)?.cardviews ?? [],
  })).filter((s) => s.cardviews.length > 0);
}

export function getNewCards(data: EdhrecCommanderData): EdhrecCardView[] {
  return findCardlist(data, "newcards")?.cardviews ?? [];
}

function playRate(c: EdhrecCardView): number {
  return c.potential_decks > 0 ? c.num_decks / c.potential_decks : 0;
}

// The overall most-played nonland cards with this commander, ranked by play rate. Lands are
// excluded — nearly every deck plays Command Tower, the color-fixing lands, etc., so that list
// would just be an unsurprising "which lands exist" ranking rather than a useful one.
export function getMostPlayed(data: EdhrecCommanderData, cap = 200): EdhrecCardView[] {
  const seen = new Map<string, EdhrecCardView>();
  for (const section of getTypeSections(data)) {
    if (!NONLAND_TAGS.has(section.tag)) continue;
    for (const c of section.cardviews) {
      if (!seen.has(c.name)) seen.set(c.name, c);
    }
  }
  return Array.from(seen.values())
    .sort((a, b) => playRate(b) - playRate(a))
    .slice(0, cap);
}

export interface EdhrecPublicDeck {
  urlhash: string;
  savedate: string;
  priceUsd: number;
  salt: number;
  creature: number;
  instant: number;
  sorcery: number;
  artifact: number;
  enchantment: number;
  planeswalker: number;
  land: number;
}

export function edhrecDeckUrl(urlhash: string): string {
  return `https://edhrec.com/deckpreview/${urlhash}`;
}

export interface EdhrecDeckSource {
  siteName: string;
  url: string;
}

const SITE_LABELS: Record<string, string> = {
  "moxfield.com": "Moxfield",
  "archidekt.com": "Archidekt",
  "tappedout.net": "TappedOut",
  "deckstats.net": "Deckstats",
  "cubecobra.com": "CubeCobra",
  "mtggoldfish.com": "MTGGoldfish",
};

const deckSourceCache = new Map<string, { at: number; source: EdhrecDeckSource | null }>();
const DECK_SOURCE_TTL_MS = 24 * 60 * 60 * 1000;

// The original deck this was submitted from (Moxfield, Archidekt, etc), scraped from the
// server-rendered "Source: <a href=...>" line on the deck's EDHREC page — this is the closest
// thing to creator credit EDHREC's bulk data exposes; the linked page shows the real builder.
// Pages pass `waitMs` so a slow EDHREC never holds up the page: if the answer isn't ready in time
// they get null now, the fetch carries on in the background, and the next visitor gets it cached.
const sourceInflight = new Map<string, Promise<EdhrecDeckSource | null>>();
const within = <T,>(p: Promise<T>, waitMs: number | undefined, fallback: T): Promise<T> =>
  waitMs === undefined ? p : Promise.race([p, new Promise<T>((r) => setTimeout(() => r(fallback), waitMs))]);

export async function getEdhrecDeckSource(urlhash: string, waitMs?: number): Promise<EdhrecDeckSource | null> {
  const cached = deckSourceCache.get(urlhash);
  if (cached && Date.now() - cached.at < DECK_SOURCE_TTL_MS) return cached.source;
  let p = sourceInflight.get(urlhash);
  if (!p) {
    p = fetchDeckSource(urlhash).finally(() => sourceInflight.delete(urlhash));
    sourceInflight.set(urlhash, p);
  }
  return within(p, waitMs, null);
}

async function fetchDeckSource(urlhash: string): Promise<EdhrecDeckSource | null> {
  try {
    const res = await fetch(edhrecDeckUrl(urlhash), {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; mtg-hub/1.0)" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      deckSourceCache.set(urlhash, { at: Date.now(), source: null });
      return null;
    }
    const html = await res.text();
    const match = html.match(/Source:\s*<a href="([^"]+)"/);
    if (!match) {
      deckSourceCache.set(urlhash, { at: Date.now(), source: null });
      return null;
    }
    const url = match[1].replace(/&amp;/g, "&");
    let siteName = "the original source";
    try {
      const hostname = new URL(url).hostname.replace(/^www\./, "");
      siteName = SITE_LABELS[hostname] ?? hostname;
    } catch {
      // keep fallback label
    }
    const source = { siteName, url };
    deckSourceCache.set(urlhash, { at: Date.now(), source });
    return source;
  } catch {
    return null;
  }
}

// A spread of well-known, popular commanders across colors and archetypes, used to seed a
// random assortment of public decks on the general Decks page (EDHREC has no "random deck
// across all commanders" endpoint, so we sample from a curated pool of commanders instead).
export const POPULAR_COMMANDERS = [
  "Atraxa, Praetors' Voice",
  "Krenko, Mob Boss",
  "The Ur-Dragon",
  "Yuriko, the Tiger's Shadow",
  "Korvold, Fae-Cursed King",
  "Muldrotha, the Gravetide",
  "Edgar Markov",
  "Meren of Clan Nel Toth",
  "Prossh, Skyraider of Kher",
  "Kenrith, the Returned King",
  "Lathril, Blade of the Elves",
  "Miirym, Sentinel Wyrm",
  "Sheoldred, the Apocalypse",
  "Golos, Tireless Pilgrim",
  "Chulane, Teller of Tales",
  "Kess, Dissident Mage",
  "Feather, the Redeemed",
  "The Gitrog Monster",
  "Yarok, the Desecrated",
  "Niv-Mizzet, Parun",
  "Tymna the Weaver",
  "Old Gnawbone",
  "Ayara, First of Locthwain",
  "Magda, Brazen Outlaw",
];

/** The same order for everyone within one seed (e.g. the hour), so the feed's EDHREC data stays warm. */
export function seededShuffle<T>(items: T[], seed: number): T[] {
  const arr = items.slice();
  let a = seed >>> 0;
  const rnd = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function shuffled<T>(items: T[]): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// This feed can be 10MB+ for popular commanders (every deck EDHREC has on file), which is over
// Next's 2MB fetch-cache limit, so `next: { revalidate }` can't cache it and would silently
// re-download the whole thing on every request. We keep our own small in-memory cache of just
// the derived sample instead, since that's the only part worth remembering.
const publicDecksCache = new Map<string, { at: number; decks: EdhrecPublicDeck[] }>();
const PUBLIC_DECKS_TTL_MS = 6 * 60 * 60 * 1000;
const PUBLIC_DECKS_SAMPLE = 24; // always cache this many, so every caller gets the size it asks for
const publicDecksInflight = new Map<string, Promise<EdhrecPublicDeck[] | null>>();

// Real decks submitted to EDHREC for this commander (each sourced from Moxfield, Archidekt,
// etc.) — we only keep a recent sample rather than holding the whole feed in memory.
export async function getEdhrecPublicDecks(
  name: string,
  sampleSize = 24,
  waitMs?: number
): Promise<EdhrecPublicDeck[] | null> {
  const slug = edhrecSlug(name);

  const cached = publicDecksCache.get(slug);
  if (cached && Date.now() - cached.at < PUBLIC_DECKS_TTL_MS) return cached.decks.slice(0, sampleSize);
  let p = publicDecksInflight.get(slug);
  if (!p) {
    p = fetchPublicDecks(slug).finally(() => publicDecksInflight.delete(slug));
    publicDecksInflight.set(slug, p);
  }
  const decks = await within(p, waitMs, null);
  return decks ? decks.slice(0, sampleSize) : null;
}

/** True when this commander's EDHREC decks are already in memory (no waiting). */
export function edhrecDecksCached(name: string): boolean {
  const c = publicDecksCache.get(edhrecSlug(name));
  return !!c && Date.now() - c.at < PUBLIC_DECKS_TTL_MS;
}

async function fetchPublicDecks(slug: string): Promise<EdhrecPublicDeck[] | null> {
  try {
    const res = await fetch(`https://json.edhrec.com/pages/decks/${slug}.json`, {
      headers: { "User-Agent": "mtg-hub/1.0", Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const table: Record<string, unknown>[] = data?.table ?? [];
    const decks = table
      .slice()
      .sort((a, b) => String(b.savedate ?? "").localeCompare(String(a.savedate ?? "")))
      .slice(0, PUBLIC_DECKS_SAMPLE)
      .map((row) => ({
        urlhash: String(row.urlhash ?? ""),
        savedate: String(row.savedate ?? ""),
        priceUsd: Number(row.price ?? 0),
        salt: Number(row.salt ?? 0),
        creature: Number(row.creature ?? 0),
        instant: Number(row.instant ?? 0),
        sorcery: Number(row.sorcery ?? 0),
        artifact: Number(row.artifact ?? 0),
        enchantment: Number(row.enchantment ?? 0),
        planeswalker: Number(row.planeswalker ?? 0),
        land: Number(row.land ?? 0),
      }))
      .filter((d) => d.urlhash);

    publicDecksCache.set(slug, { at: Date.now(), decks });
    return decks;
  } catch {
    return null;
  }
}
