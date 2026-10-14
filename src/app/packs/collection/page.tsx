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
const RARITY_RANK: Record<string, number> = { mythic: 4, rare: 3, uncommon: 2, common: 1 };
const money = (n: number | null) => (n == null ? "—" : `$${n.toFixed(2)}`);

type Card = {
  id: string;
  name: string;
  rarity: string;
  priceUsd: number | null;
  quantity: number;
  foilQuantity: number;
  firstPulledAt: Date;
  imageUrl: string | null;
  scryfallUri: string | null;
  setName: string;
  collectorNumber: string | null;
};

const qtyOf = (c: Card) => c.quantity + c.foilQuantity;
// Collector number as a number; non-numeric (e.g. promos) sort to the end.
const cnum = (s: string | null) => {
  const n = parseInt(s ?? "", 10);
  return Number.isFinite(n) ? n : 1e9;
};

const SORTS: { key: string; label: string; cmp: (a: Card, b: Card) => number }[] = [
  {
    key: "set",
    label: "Set → color",
    // Within a booster set, collector numbers run in color order (W,U,B,R,G, multi, colorless, lands).
    cmp: (a, b) =>
      a.setName.localeCompare(b.setName) ||
      cnum(a.collectorNumber) - cnum(b.collectorNumber) ||
      (a.collectorNumber ?? "").localeCompare(b.collectorNumber ?? "") ||
      a.name.localeCompare(b.name),
  },
  { key: "value-desc", label: "Value ↓", cmp: (a, b) => (b.priceUsd ?? -1) - (a.priceUsd ?? -1) || a.name.localeCompare(b.name) },
  { key: "value-asc", label: "Value ↑", cmp: (a, b) => (a.priceUsd ?? Infinity) - (b.priceUsd ?? Infinity) || a.name.localeCompare(b.name) },
  { key: "name", label: "Name A–Z", cmp: (a, b) => a.name.localeCompare(b.name) },
  { key: "rarity", label: "Rarity", cmp: (a, b) => (RARITY_RANK[b.rarity] ?? 0) - (RARITY_RANK[a.rarity] ?? 0) || (b.priceUsd ?? -1) - (a.priceUsd ?? -1) },
  { key: "newest", label: "Newest", cmp: (a, b) => b.firstPulledAt.getTime() - a.firstPulledAt.getTime() },
  { key: "qty", label: "Most copies", cmp: (a, b) => qtyOf(b) - qtyOf(a) || (b.priceUsd ?? -1) - (a.priceUsd ?? -1) },
];

export default async function CollectionPage({ searchParams }: { searchParams: Promise<{ sort?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/packs/collection");

  const sp = await searchParams;
  const active = SORTS.find((s) => s.key === sp.sort) ?? SORTS[0];

  const cards = (await db.collectionCard.findMany({
    where: { userId: session.user.id },
    take: 1000,
  })) as Card[];

  cards.sort(active.cmp);

  const totalCards = cards.reduce((s, c) => s + qtyOf(c), 0);
  const totalValue = cards.reduce((s, c) => s + (c.priceUsd ?? 0) * qtyOf(c), 0);
  const best = cards.reduce<Card | null>((b, c) => ((c.priceUsd ?? 0) > (b?.priceUsd ?? 0) ? c : b), null);

  return (
    <>
      <PageHeader
        title="Your collection"
        description="Every card you've pulled from Open Packs."
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

            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className="mr-1 text-xs uppercase tracking-wide text-muted">Sort</span>
              {SORTS.map((s) => {
                const on = s.key === active.key;
                return (
                  <Link
                    key={s.key}
                    href={`/packs/collection?sort=${s.key}`}
                    scroll={false}
                    aria-current={on ? "true" : undefined}
                    className={
                      on
                        ? "rounded-full bg-gold px-3 py-1.5 text-xs font-bold text-black"
                        : "rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted hover:border-gold hover:text-foreground"
                    }
                  >
                    {s.label}
                  </Link>
                );
              })}
            </div>

            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5 lg:grid-cols-7 2xl:grid-cols-9">
              {cards.map((c) => {
                const qty = qtyOf(c);
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
