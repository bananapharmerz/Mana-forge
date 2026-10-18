import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getCardsByIds } from "@/lib/scryfall";
import { getSetPoolSize } from "@/lib/packs";
import PageHeader from "@/components/PageHeader";
import BuildFromCollection from "./BuildFromCollection";

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
  scryfallId: string;
  name: string;
  rarity: string;
  colors: string | null;
  isLand: boolean | null;
  priceUsd: number | null;
  quantity: number;
  foilQuantity: number;
  firstPulledAt: Date;
  imageUrl: string | null;
  scryfallUri: string | null;
  setCode: string;
  setName: string;
};

const qtyOf = (c: Card) => c.quantity + c.foilQuantity;
const rarityScore = (c: Card) => RARITY_RANK[c.rarity] ?? 0;
// Color identity → sort bucket: mono W,U,B,R,G (1-5), multicolor (6), colorless/lands (7), unknown (8).
const COLOR_ORDER = "WUBRG";
const colorRank = (colors: string | null) => {
  if (colors == null) return 8;
  if (colors === "") return 7;
  if (colors.length === 1) return COLOR_ORDER.indexOf(colors) + 1;
  return 6;
};
// Lands are their own category at the very end, whatever their colour identity.
const landRank = (c: Card) => (c.isLand ? 1 : 0);

const SORTS: { key: string; label: string; cmp: (a: Card, b: Card) => number }[] = [
  {
    key: "set",
    label: "Set → color → rarity",
    cmp: (a, b) =>
      landRank(a) - landRank(b) ||
      a.setName.localeCompare(b.setName) ||
      colorRank(a.colors) - colorRank(b.colors) ||
      (a.colors ?? "").localeCompare(b.colors ?? "") ||
      rarityScore(b) - rarityScore(a) ||
      (b.priceUsd ?? -1) - (a.priceUsd ?? -1) ||
      a.name.localeCompare(b.name),
  },
  {
    key: "color",
    label: "Color → rarity",
    cmp: (a, b) =>
      landRank(a) - landRank(b) ||
      colorRank(a.colors) - colorRank(b.colors) ||
      (a.colors ?? "").localeCompare(b.colors ?? "") ||
      rarityScore(b) - rarityScore(a) ||
      (b.priceUsd ?? -1) - (a.priceUsd ?? -1) ||
      a.name.localeCompare(b.name),
  },
  { key: "value-desc", label: "Value ↓", cmp: (a, b) => (b.priceUsd ?? -1) - (a.priceUsd ?? -1) || a.name.localeCompare(b.name) },
  { key: "value-asc", label: "Value ↑", cmp: (a, b) => (a.priceUsd ?? Infinity) - (b.priceUsd ?? Infinity) || a.name.localeCompare(b.name) },
  { key: "name", label: "Name A–Z", cmp: (a, b) => a.name.localeCompare(b.name) },
  { key: "rarity", label: "Rarity", cmp: (a, b) => rarityScore(b) - rarityScore(a) || (b.priceUsd ?? -1) - (a.priceUsd ?? -1) },
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

  // One-time backfill: older pulls have no stored colour identity or land flag. Fetch them from
  // Scryfall by printing id and persist, so set→color→rarity has real colours and lands drop into
  // their own category at the end.
  const missing = cards.filter((c) => c.colors == null || c.isLand == null);
  if (missing.length) {
    try {
      const found = await getCardsByIds(missing.map((c) => c.scryfallId));
      const byId = new Map(found.map((c) => [c.id, c]));
      const writes: Promise<unknown>[] = [];
      for (const c of missing) {
        const sc = byId.get(c.scryfallId);
        if (!sc) continue;
        const data: { colors?: string; isLand?: boolean } = {};
        if (c.colors == null) {
          c.colors = (sc.color_identity ?? []).join("");
          data.colors = c.colors;
        }
        if (c.isLand == null) {
          const types = [sc.type_line ?? "", ...(sc.card_faces?.map((f) => f.type_line ?? "") ?? [])];
          c.isLand = types.some((t) => /\bland\b/i.test(t));
          data.isLand = c.isLand;
        }
        if (Object.keys(data).length) writes.push(db.collectionCard.update({ where: { id: c.id }, data }));
      }
      await Promise.all(writes);
    } catch {
      // Scryfall busy — leave the missing fields null this time; they backfill on a later load.
    }
  }

  cards.sort(active.cmp);

  const totalCards = cards.reduce((s, c) => s + qtyOf(c), 0);
  const totalValue = cards.reduce((s, c) => s + (c.priceUsd ?? 0) * qtyOf(c), 0);
  const best = cards.reduce<Card | null>((b, c) => ((c.priceUsd ?? 0) > (b?.priceUsd ?? 0) ? c : b), null);

  // Set completion: how many of each set's pullable cards you own. The denominator is the pack
  // pool (the exact query packs draw from), so 100% means you've pulled every card that set can
  // give. Count by card name, since the pool collapses art variants to one card.
  const bySet = new Map<string, { code: string; name: string; names: Set<string>; copies: number; value: number }>();
  for (const c of cards) {
    let e = bySet.get(c.setCode);
    if (!e) {
      e = { code: c.setCode, name: c.setName, names: new Set(), copies: 0, value: 0 };
      bySet.set(c.setCode, e);
    }
    e.names.add(c.name);
    e.copies += qtyOf(c);
    e.value += (c.priceUsd ?? 0) * qtyOf(c);
  }
  const setSizes = new Map(
    await Promise.all([...bySet.keys()].map(async (code) => [code, await getSetPoolSize(code)] as const))
  );
  const setStats = [...bySet.values()]
    .map((e) => {
      const total = setSizes.get(e.code) ?? null;
      const owned = total != null ? Math.min(e.names.size, total) : e.names.size;
      const pct = total && total > 0 ? Math.min(100, Math.round((owned / total) * 100)) : null;
      return { ...e, total, owned, pct };
    })
    .sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1) || b.owned - a.owned || a.name.localeCompare(b.name));

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

            <BuildFromCollection />

            {setStats.length > 0 && (
              <div className="mt-10">
                <h2 className="mb-1 font-display text-lg font-semibold text-foreground">Set completion</h2>
                <p className="mb-4 text-xs text-muted">
                  How many of each set&apos;s pullable cards you&apos;ve collected — basic lands and
                  special variants aside, so 100% means the whole set.
                </p>
                <div className="flex flex-col gap-2.5">
                  {setStats.map((s) => (
                    <div key={s.code} className="card-frame p-3">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="truncate text-sm font-semibold text-foreground">{s.name}</span>
                        <span className="shrink-0 text-xs text-muted">
                          {s.total != null ? (
                            <>
                              <span className="font-semibold text-foreground">{s.owned}</span> / {s.total}
                              {s.pct != null ? ` · ${s.pct}%` : ""}
                            </>
                          ) : (
                            <>{s.owned} cards</>
                          )}
                        </span>
                      </div>
                      {s.pct != null && (
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-raised">
                          <div className="h-full rounded-full bg-gold" style={{ width: `${s.pct}%` }} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
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
