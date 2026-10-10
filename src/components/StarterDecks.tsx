import Link from "next/link";
import { db } from "@/lib/db";
import { authorName } from "@/lib/author";
import MakeItMineButton from "@/components/MakeItMineButton";

// The fastest way to a first win: a ready-made 100-card deck in one click. Shows the most-liked
// public decks (one per commander); "Make it mine" copies it into your account and opens it in the
// builder, where you can tweak it or take it straight to a game.
export default async function StarterDecks({ signedIn, title }: { signedIn: boolean; title?: string }) {
  const rows = await db.deck
    .findMany({
      where: { isPublic: true },
      orderBy: [{ favorites: { _count: "desc" } }, { updatedAt: "desc" }],
      take: 24,
      select: { id: true, name: true, commanderName: true, commanderData: true, cards: true, owner: { select: { name: true } }, _count: { select: { favorites: true } } },
    })
    .catch(() => []);
  const seen = new Set<string>();
  const picks = rows.filter((r) => (seen.has(r.commanderName) ? false : (seen.add(r.commanderName), true))).slice(0, 4);
  if (!picks.length) return null;
  const image = (json: string) => {
    try {
      return (JSON.parse(json) as { imageUrl?: string }).imageUrl;
    } catch {
      return undefined;
    }
  };
  const size = (json: string) => {
    try {
      return (JSON.parse(json) as { quantity?: number }[]).reduce((n, c) => n + (c.quantity ?? 1), 0) + 1;
    } catch {
      return 0;
    }
  };
  return (
    <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
      <div className="mb-4 flex flex-wrap items-end gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Start in one click</p>
          <h2 className="font-display text-3xl font-semibold text-foreground">{title ?? "Grab a ready-made deck"}</h2>
        </div>
        <p className="ml-auto max-w-md text-sm text-muted">Pick a deck players love, make it yours, then tweak it or take it straight to a game with friends.</p>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {picks.map((d) => {
          const img = image(d.commanderData);
          return (
            // The whole card opens the deck (one obvious click target); copying sits in its own strip.
            <div key={d.id} className="card-frame group relative flex flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:border-gold hover:shadow-[0_12px_30px_-18px_rgba(124,88,20,0.6)]">
              <div className="aspect-[5/4] overflow-hidden bg-surface-raised">
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img} alt="" className="h-full w-full object-cover object-top transition-transform group-hover:scale-105" loading="lazy" />
                ) : null}
              </div>
              <div className="flex flex-1 flex-col gap-1 p-3">
                <Link href={`/decks/view/${d.id}`} className="line-clamp-1 text-sm font-semibold text-foreground after:absolute after:inset-0 after:content-[''] group-hover:text-gold-bright">
                  {d.name}
                </Link>
                <p className="line-clamp-1 text-xs text-muted">
                  {d.commanderName} · {size(d.cards)} cards · by {authorName(d.owner.name)}
                </p>
              </div>
              <div className="relative z-10 border-t border-border bg-surface/60 p-3">
                <MakeItMineButton deckId={d.id} signedIn={signedIn} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
