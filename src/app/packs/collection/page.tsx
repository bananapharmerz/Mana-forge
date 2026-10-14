import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import PageHeader from "@/components/PageHeader";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your collection", robots: { index: false, follow: false } };

const RARITY_DOT: Record<string, string> = {
  common: "#9aa0a6",
  uncommon: "#8fb8d6",
  rare: "#d2a142",
  mythic: "#e2592b",
};
const money = (n: number | null) => (n == null ? "—" : `$${n.toFixed(2)}`);

export default async function CollectionPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/packs/collection");

  const cards = await db.collectionCard.findMany({
    where: { userId: session.user.id },
    orderBy: [{ priceUsd: "desc" }, { name: "asc" }],
    take: 1000,
  });

  const totalCards = cards.reduce((s, c) => s + c.quantity + c.foilQuantity, 0);
  const totalValue = cards.reduce((s, c) => s + (c.priceUsd ?? 0) * (c.quantity + c.foilQuantity), 0);
  const best = cards[0] ?? null;

  return (
    <>
      <PageHeader
        title="Your collection"
        description="Every card you've pulled from Open Packs — most valuable first."
        width="max-w-[1600px]"
      >
        <Link href="/packs" className="rounded-lg bg-gold px-5 py-2.5 text-sm font-bold text-black hover:bg-gold-bright">
          Open a pack →
        </Link>
      </PageHeader>

      <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6">
        {cards.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <p className="text-muted">You haven&apos;t pulled any cards yet.</p>
            <Link href="/packs" className="rounded-lg bg-gold px-6 py-3 font-bold text-black hover:bg-gold-bright">
              Rip your first pack →
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Cards" value={totalCards.toLocaleString()} />
              <Stat label="Unique" value={cards.length.toLocaleString()} />
              <Stat label="Collection value" value={money(totalValue)} gold />
              <Stat label="Best pull" value={best ? best.name : "—"} sub={best ? money(best.priceUsd) : undefined} />
            </div>

            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5 lg:grid-cols-7 2xl:grid-cols-9">
              {cards.map((c) => {
                const qty = c.quantity + c.foilQuantity;
                return (
                  <a
                    key={c.id}
                    href={c.scryfallUri ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block"
                    title={`${c.name} — ${money(c.priceUsd)}`}
                  >
                    <div className="relative aspect-[5/7] overflow-hidden rounded-md border border-border">
                      {c.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.imageUrl} alt={c.name} className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-surface-raised p-2 text-center text-[10px] text-foreground">
                          {c.name}
                        </div>
                      )}
                      {qty > 1 && (
                        <span className="absolute right-1 top-1 rounded-full bg-black/80 px-1.5 text-[11px] font-bold text-gold-bright">×{qty}</span>
                      )}
                      {c.foilQuantity > 0 && (
                        <span className="absolute left-1 top-1 rounded-full bg-gradient-to-r from-[#ff6fd8] via-[#7afcff] to-[#feff9c] px-1.5 text-[10px] font-bold text-black">
                          ✦{c.foilQuantity > 1 ? c.foilQuantity : ""}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-1">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: RARITY_DOT[c.rarity] ?? "#9aa0a6" }} />
                      <span className="truncate text-[10px] text-muted">{money(c.priceUsd)}</span>
                    </div>
                  </a>
                );
              })}
            </div>

            <p className="mx-auto mt-8 max-w-md text-center text-xs text-muted">
              Coming soon: build a deck straight from your collection, and track set completion.
            </p>
          </>
        )}
      </div>
    </>
  );
}

function Stat({ label, value, sub, gold }: { label: string; value: string; sub?: string; gold?: boolean }) {
  return (
    <div className="card-frame p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-1 truncate font-display text-2xl font-bold ${gold ? "text-gold-bright" : "text-foreground"}`}>{value}</p>
      {sub && <p className="truncate text-xs text-muted">{sub}</p>}
    </div>
  );
}
