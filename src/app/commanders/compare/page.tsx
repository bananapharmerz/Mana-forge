import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import ManaPips from "@/components/ManaPips";
import { cardImage, getCardsByNames, type ScryfallCard } from "@/lib/scryfall";
import { getEdhrecCommanderData, getMostPlayed, type EdhrecCommanderData } from "@/lib/edhrec";

// Every A/B/C combination would be its own thin page, so search engines skip this one.
export const metadata: Metadata = {
  title: "Compare commanders",
  description: "Put up to three commanders side by side: colours, decks built, themes and most-played cards.",
  robots: { index: false, follow: true },
};

const MAX = 3;
// How deep we look for cards two commanders have in common. Deeper finds more, but they matter less.
const SHARED_DEPTH = 100;

function readNames(c: string | string[] | undefined): string[] {
  const raw = Array.isArray(c) ? c : c ? [c] : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const n of raw) {
    const name = n.trim().slice(0, 150);
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    out.push(name);
    if (out.length === MAX) break;
  }
  return out;
}

// Only real commanders get a column; anything else in the URL is quietly dropped.
function isCommander(card: ScryfallCard): boolean {
  if (card.legalities?.commander !== "legal") return false;
  const types = [card.type_line, ...(card.card_faces ?? []).map((f) => f.type_line ?? "")].join(" ");
  const text = [card.oracle_text ?? "", ...(card.card_faces ?? []).map((f) => f.oracle_text ?? "")].join(" ");
  return (types.includes("Legendary") && types.includes("Creature")) || text.includes("can be your commander");
}

export default async function CompareCommandersPage({ searchParams }: { searchParams: Promise<{ c?: string | string[] }> }) {
  const names = readNames((await searchParams).c);

  // One Scryfall batch for all columns; EDHREC pages are the same cached ones the commander pages use.
  const found = names.length ? await getCardsByNames(names) : [];
  const cards = names
    .map((n) => found.find((f) => f.name.toLowerCase() === n.toLowerCase() || f.name.split(" // ")[0].toLowerCase() === n.toLowerCase()))
    .filter((c): c is ScryfallCard => c !== undefined && isCommander(c));
  const edhrec = await Promise.all(cards.map((c) => getEdhrecCommanderData(c.name).catch(() => null)));

  const columns = cards.map((card, i) => {
    const data: EdhrecCommanderData | null = edhrec[i];
    const played = data ? getMostPlayed(data, SHARED_DEPTH) : [];
    return { card, data, played, top: played.slice(0, 5) };
  });

  // Cards that show up in the most-played lists of two or more of the picked commanders.
  const counts = new Map<string, number>();
  for (const col of columns) for (const p of col.played) counts.set(p.name, (counts.get(p.name) ?? 0) + 1);
  const shared = [...counts.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 12);

  return (
    <>
      <PageHeader title="Compare commanders" description="Up to three commanders side by side. Pick the one that fits your table, then start building." />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        {columns.length < 2 ? (
          <div className="rounded-lg border border-border p-6 text-center">
            <p className="text-sm text-muted">Pick two or three commanders with the Compare box under each card.</p>
            <Link href="/commanders" className="mt-4 inline-block rounded-md bg-gold px-4 py-2 text-sm font-semibold text-black hover:bg-gold-bright">
              Browse commanders
            </Link>
          </div>
        ) : (
          <>
            {/* Columns scroll sideways on phones instead of squashing three cards into 390px. */}
            <div className="-mx-4 overflow-x-auto px-4 pb-2">
              <div className="grid min-w-[640px] gap-4" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(200px, 1fr))` }}>
                {columns.map(({ card, data, top }) => {
                  const img = cardImage(card);
                  const o = data?.overview;
                  return (
                    <section key={card.id} className="card-frame flex flex-col gap-3 p-3">
                      <Link href={`/decks/${encodeURIComponent(card.name)}`} className="group">
                        <div className="relative aspect-[5/7] w-full overflow-hidden rounded-md bg-surface-raised">
                          {img ? <Image src={img} alt={card.name} fill sizes="(max-width: 768px) 60vw, 30vw" className="object-cover" /> : null}
                        </div>
                        <h2 className="mt-2 text-sm font-semibold text-foreground group-hover:text-gold-bright">{card.name}</h2>
                      </Link>
                      <ManaPips colors={card.color_identity} />
                      {o?.numDecks ? (
                        <p className="text-xs text-muted">
                          <span className="font-semibold text-foreground">{o.numDecks.toLocaleString("en-US")}</span> decks on EDHREC
                        </p>
                      ) : null}
                      {o && o.themes.length > 0 ? (
                        <div>
                          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted">Top themes</h3>
                          <p className="text-xs text-foreground">{o.themes.slice(0, 3).map((t) => t.name).join(", ")}</p>
                        </div>
                      ) : null}
                      {top.length > 0 ? (
                        <div>
                          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted">Most played</h3>
                          <ol className="space-y-0.5 text-xs">
                            {top.map((c) => (
                              <li key={c.name} className="truncate text-gold-bright">
                                {c.name}{" "}
                                <span className="text-muted">{c.potential_decks ? Math.round((c.num_decks / c.potential_decks) * 100) : 0}%</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      ) : null}
                      {o && o.similar.length > 0 ? (
                        <p className="text-xs text-muted">
                          Similar:{" "}
                          {o.similar.slice(0, 3).map((s, i, arr) => (
                            <span key={s}>
                              <Link href={`/decks/${encodeURIComponent(s)}`} className="text-foreground underline hover:text-gold-bright">{s}</Link>
                              {i < arr.length - 1 ? ", " : ""}
                            </span>
                          ))}
                        </p>
                      ) : null}
                      <Link
                        href={`/deck-builder?commander=${encodeURIComponent(card.name)}`}
                        className="mt-auto rounded-md bg-gold px-3 py-2 text-center text-sm font-semibold text-black hover:bg-gold-bright"
                      >
                        Build this one
                      </Link>
                    </section>
                  );
                })}
              </div>
            </div>

            {shared.length > 0 && (
              <section className="mt-8">
                <h2 className="mb-2 text-sm font-semibold text-foreground">Cards they share</h2>
                <ul className="flex flex-wrap gap-2 text-xs">
                  {shared.map(([name, n]) => (
                    <li key={name} className="rounded-full border border-border px-3 py-1 text-gold-bright">
                      {name}
                      {columns.length === 3 ? <span className="text-muted"> · {n === 3 ? "all 3" : "2 of 3"}</span> : null}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
        <p className="mt-8 text-xs text-muted">Deck counts, themes and play rates via EDHREC. Card images via Scryfall.</p>
      </div>
    </>
  );
}
