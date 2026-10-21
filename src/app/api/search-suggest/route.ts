import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { commanderNames } from "@/lib/commanderIndex";

// Suggestions for the header search ("Search commanders or cards"). Everything comes from what
// this server already has: commanders from the in-memory commander list, cards from the tracked
// printings in CardPrice. So typing in the header never sends a visitor's browser to Scryfall and
// never adds a Scryfall request, however fast people type.

export const dynamic = "force-dynamic";

type Suggestions = { commanders: string[]; cards: { name: string; id: string }[] };

const g = globalThis as unknown as { __navSuggest?: Map<string, { at: number; data: Suggestions }> };
const TTL = 10 * 60000;
const MAX = 5;

// Names that start with what was typed come first, then names that only contain it.
function rank(names: string[], q: string): string[] {
  const starts: string[] = [];
  const contains: string[] = [];
  for (const n of names) {
    const lower = n.toLowerCase();
    if (lower.startsWith(q)) starts.push(n);
    else if (lower.includes(q)) contains.push(n);
    if (starts.length >= MAX) break;
  }
  return [...starts, ...contains].slice(0, MAX);
}

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("q") ?? "";
  // % and _ are LIKE wildcards in SQLite; they never appear in card names, so drop them.
  const q = raw.replace(/[\u0000-\u001f%_"]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
  if (q.length < 2) return reply({ commanders: [], cards: [] });
  const key = q.toLowerCase();

  const cache = (g.__navSuggest ??= new Map());
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return reply(hit.data);

  const commanders = rank(commanderNames(), key);

  // One row per card name: the priciest tracked printing, since that's the one people look up.
  let cards: Suggestions["cards"] = [];
  try {
    const rows = await db.cardPrice.findMany({
      where: { name: { contains: q } },
      orderBy: { usd: "desc" },
      select: { scryfallId: true, name: true },
      take: 40,
    });
    const byName = new Map<string, string>();
    for (const r of rows) if (!byName.has(r.name)) byName.set(r.name, r.scryfallId);
    cards = rank([...byName.keys()], key).map((name) => ({ name, id: byName.get(name)! }));
  } catch {
    cards = [];
  }

  const data: Suggestions = { commanders, cards };
  if (cache.size > 500) cache.clear();
  cache.set(key, { at: Date.now(), data });
  return reply(data);
}

function reply(data: Suggestions) {
  return NextResponse.json(data, { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" } });
}
