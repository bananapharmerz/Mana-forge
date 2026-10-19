// The stat tiles a member can show on their public profile. They pick up to MAX_STATS from this
// catalogue; the profile renders them in the chosen order. Keys are stored as a JSON array on
// User.profileStats (null = DEFAULT_STATS). `soon` marks stats whose data source doesn't exist
// yet (win-rate, games) — offered so the choice is visible, shown as "—" until games are tracked.

export type StatKey =
  | "publicDecks"
  | "totalDecks"
  | "posts"
  | "upvotes"
  | "favorites"
  | "cardsOwned"
  | "uniqueCards"
  | "winRate"
  | "gamesPlayed";

export interface StatDef {
  key: StatKey;
  label: string;
  soon?: boolean; // no data source yet
}

export const STAT_CATALOG: StatDef[] = [
  { key: "publicDecks", label: "Public decks" },
  { key: "totalDecks", label: "Total decks" },
  { key: "posts", label: "Posts" },
  { key: "upvotes", label: "Upvotes" },
  { key: "favorites", label: "Favorites" },
  { key: "cardsOwned", label: "Cards owned" },
  { key: "uniqueCards", label: "Unique cards" },
  { key: "winRate", label: "Win rate" },
  { key: "gamesPlayed", label: "Games played" },
];

export const STAT_LABELS: Record<StatKey, string> = Object.fromEntries(
  STAT_CATALOG.map((s) => [s.key, s.label])
) as Record<StatKey, string>;

const VALID = new Set<string>(STAT_CATALOG.map((s) => s.key));

export const DEFAULT_STATS: StatKey[] = ["publicDecks", "posts", "upvotes", "favorites"];
export const MAX_STATS = 4;

/** Parse the stored JSON into a clean, deduped, capped list of valid stat keys. */
export function parseStats(json: string | null | undefined): StatKey[] {
  if (!json) return DEFAULT_STATS;
  try {
    const arr = JSON.parse(json);
    if (!Array.isArray(arr)) return DEFAULT_STATS;
    const out: StatKey[] = [];
    for (const k of arr) {
      if (typeof k === "string" && VALID.has(k) && !out.includes(k as StatKey)) out.push(k as StatKey);
      if (out.length >= MAX_STATS) break;
    }
    return out.length ? out : DEFAULT_STATS;
  } catch {
    return DEFAULT_STATS;
  }
}

/** Validate a chosen list before storing: keep valid, deduped, capped; return a JSON string or null. */
export function serializeStats(keys: unknown): string | null {
  if (!Array.isArray(keys)) return null;
  const out: string[] = [];
  for (const k of keys) {
    if (typeof k === "string" && VALID.has(k) && !out.includes(k)) out.push(k);
    if (out.length >= MAX_STATS) break;
  }
  // Store null when it matches the default, so the column stays empty for most people.
  if (out.length === 0) return null;
  if (out.length === DEFAULT_STATS.length && out.every((k, i) => k === DEFAULT_STATS[i])) return null;
  return JSON.stringify(out);
}
