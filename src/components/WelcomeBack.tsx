import Link from "next/link";
import { db } from "@/lib/db";
import { priceHistory } from "@/lib/prices";
import { listOpenRooms } from "@/lib/gameRooms";

// For signed-in players: pick up where you left off. The deck you touched last, how your watched
// cards moved this week, new decks for the commanders you play, and tables open right now — so
// every visit starts with something that's yours, not the same intro again.
export default async function WelcomeBack({ userId, name }: { userId: string; name?: string | null }) {
  const week = new Date(Date.now() - 7 * 86400000);
  const [last, myCommanders, watches] = await Promise.all([
    db.deck.findFirst({ where: { ownerId: userId }, orderBy: { updatedAt: "desc" }, select: { id: true, name: true, commanderName: true, commanderData: true, updatedAt: true } }),
    db.deck.findMany({ where: { ownerId: userId }, select: { commanderName: true }, distinct: ["commanderName"], take: 20 }),
    db.priceWatch.findMany({ where: { userId }, select: { scryfallId: true, name: true, targetUsd: true }, take: 40 }),
  ]);
  if (!last) return null;
  const commanders = myCommanders.map((d) => d.commanderName).filter(Boolean);
  const newForMine = commanders.length
    ? await db.deck.groupBy({ by: ["commanderName"], where: { isPublic: true, ownerId: { not: userId }, createdAt: { gte: week }, commanderName: { in: commanders } }, _count: { _all: true } })
    : [];
  const hist = await priceHistory(
    watches.map((w) => w.scryfallId),
    7
  );
  const movers = watches
    .map((w) => {
      const h = (hist[w.scryfallId] ?? []).filter((x) => x.usd !== null);
      if (h.length < 2) return null;
      const from = h[0].usd!;
      const to = h[h.length - 1].usd!;
      return { name: w.name, from, to, pct: from ? ((to - from) / from) * 100 : 0, hit: w.targetUsd !== null && to <= w.targetUsd };
    })
    .filter((x): x is NonNullable<typeof x> => !!x && (Math.abs(x.pct) >= 3 || x.hit))
    .sort((a, b) => Number(b.hit) - Number(a.hit) || Math.abs(b.pct) - Math.abs(a.pct))
    .slice(0, 4);
  const open = listOpenRooms().filter((r) => r.playerCount < r.maxPlayers).length;
  let img: string | undefined;
  try {
    img = (JSON.parse(last.commanderData) as { imageUrl?: string }).imageUrl;
  } catch {}
  const first = (name ?? "").trim().split(/\s+/)[0];

  return (
    <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
      <div className="card-frame grid gap-4 p-4 md:grid-cols-[auto_1fr_1fr]">
        <div className="flex items-center gap-3">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt="" className="h-20 w-14 rounded object-cover object-top" />
          ) : null}
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-gold">Welcome back{first ? `, ${first}` : ""}</p>
            <p className="mt-0.5 text-sm text-muted">Pick up where you left off:</p>
            <p className="font-semibold text-foreground">{last.name}</p>
            <div className="mt-2 flex gap-2">
              <Link href={`/deck-builder/${last.id}`} className="rounded-md bg-gold px-3 py-1.5 text-xs font-semibold text-black hover:bg-gold-bright">
                Keep building
              </Link>
              <Link href="/play" className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:border-gold">
                Play it
              </Link>
            </div>
          </div>
        </div>
        <div className="text-sm">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Your watchlist this week</p>
          {movers.length ? (
            <ul className="space-y-1">
              {movers.map((m) => (
                <li key={m.name} className="flex items-baseline gap-2">
                  <span className="truncate text-foreground">{m.name}</span>
                  <span className={`ml-auto shrink-0 font-mono text-xs ${m.pct < 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {m.hit ? "🎯 target hit · " : ""}${m.to.toFixed(2)} ({m.pct >= 0 ? "+" : ""}
                    {m.pct.toFixed(0)}%)
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">
              {watches.length ? "No big moves on your cards this week." : "Watch cards on the price tracker and their moves show up here."}{" "}
              <Link href="/prices" className="text-gold-bright underline">
                Prices →
              </Link>
            </p>
          )}
        </div>
        <div className="text-sm">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">New this week</p>
          <ul className="space-y-1">
            {newForMine.slice(0, 3).map((c) => (
              <li key={c.commanderName}>
                <Link href={`/decks/${encodeURIComponent(c.commanderName)}`} className="text-foreground hover:text-gold-bright">
                  {c._count._all} new {c.commanderName} deck{c._count._all === 1 ? "" : "s"}
                </Link>
              </li>
            ))}
            {!newForMine.length && <li className="text-muted">No new decks for your commanders yet this week.</li>}
            <li>
              <Link href="/play" className="text-foreground hover:text-gold-bright">
                {open ? `${open} open table${open === 1 ? "" : "s"} looking for players →` : "Start a table and invite friends →"}
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
