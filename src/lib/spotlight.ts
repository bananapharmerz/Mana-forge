import type { ScryfallCard } from "@/lib/scryfall";

// Commander of the day, the week and the month. Picked from the commander list Mana Forge keeps in
// memory (src/lib/commanderIndex.ts, ordered by how many decks play them), so there's no database or
// admin work: the same date always gives the same commander, and it changes by itself at midnight
// (UTC), on Mondays and on the 1st. Popular picks for the month, deeper cuts for the day.

export interface Spotlight {
  period: "day" | "week" | "month";
  label: string;
  name: string;
  typeLine: string;
  colors: string[];
  art: string | null;
  rank: number | null;
  changes: string; // when the next one comes, e.g. "New one tomorrow"
}

const POOLS = { month: 60, week: 150, day: 400 } as const;

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function isoWeek(d: Date) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear();
  const week = Math.ceil(((t.getTime() - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7);
  return `${y}-W${week}`;
}

export function commanderSpotlights(now = new Date()): Spotlight[] | null {
  const map = (globalThis as unknown as { __mfCommanderCards?: Map<string, ScryfallCard> }).__mfCommanderCards;
  if (!map || map.size < 100) return null;
  const all = [...map.values()].filter((c) => (c.image_uris?.art_crop || c.card_faces?.[0]?.image_uris?.art_crop) && !/background/i.test(c.type_line ?? ""));
  const keys = {
    month: now.toISOString().slice(0, 7),
    week: isoWeek(now),
    day: now.toISOString().slice(0, 10),
  };
  const taken = new Set<string>();
  const pick = (period: keyof typeof POOLS) => {
    const pool = all.slice(0, POOLS[period]);
    let i = hash(`${period}:${keys[period]}`) % pool.length;
    while (taken.has(pool[i].name)) i = (i + 1) % pool.length;
    taken.add(pool[i].name);
    return pool[i];
  };
  const make = (period: Spotlight["period"], label: string, changes: string): Spotlight => {
    const c = pick(period);
    return {
      period,
      label,
      name: c.name,
      typeLine: c.type_line ?? "Legendary Creature",
      colors: c.color_identity ?? [],
      art: c.image_uris?.art_crop ?? c.card_faces?.[0]?.image_uris?.art_crop ?? null,
      rank: c.edhrec_rank ?? null,
      changes,
    };
  };
  // the month first so it gets the most popular pool to itself
  const month = make("month", "Commander of the month", "New one on the 1st");
  const week = make("week", "Commander of the week", "New one on Monday");
  const day = make("day", "Commander of the day", "New one tomorrow");
  return [day, week, month];
}
