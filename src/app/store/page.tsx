import Link from "next/link";
import { db } from "@/lib/db";
import { formatCents } from "@/lib/money";
import ProductIcon from "@/components/ProductIcon";
import AddToCartButton from "@/components/AddToCartButton";
import AdSlot from "@/components/AdSlot";
import ProductShowcase from "@/components/forge3d/ProductShowcase";
import { auth } from "@/auth";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Store — sleeves, deck boxes, playmats & dice",
  description: "Sleeves, deck boxes, playmats, dice and life counters for Commander players.",
  alternates: { canonical: "/store" },
};

export const revalidate = 300;

const CATEGORY_LABELS: Record<string, string> = {
  sleeves: "Sleeves",
  deckbox: "Deck Boxes",
  playmat: "Playmats",
  dice: "Dice",
  "life-counter": "Life Counters",
};

export default async function StorePage() {
  const products = await db.product.findMany({ orderBy: { category: "asc" } });
  const session = await auth();
  const user = session?.user?.id
    ? await db.user.findUnique({ where: { id: session.user.id } })
    : null;

  const grouped = Object.entries(
    products.reduce<Record<string, typeof products>>((acc, p) => {
      (acc[p.category] ??= []).push(p);
      return acc;
    }, {})
  );

  // The showcase at the top features the store's most premium item that's in stock.
  const featured = [...products].filter((p) => p.stock > 0).sort((a, b) => b.priceCents - a.priceCents)[0];

  return (
    <>
    {featured && (
      <ProductShowcase
        eyebrow="Featured in the forge"
        detailHref={`/store/${featured.id}`}
        skipHref="#products"
        product={{ id: featured.id, name: featured.name, description: featured.description, priceCents: featured.priceCents, category: featured.category, icon: featured.icon, stock: featured.stock }}
      />
    )}
    <div id="products" className="mx-auto max-w-6xl scroll-mt-4 px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Store</h1>
          <p className="mt-1 text-muted">Sleeves, deck boxes, playmats, dice, and more.</p>
        </div>
        <Link
          href="/store/cart"
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-gold"
        >
          View Cart
        </Link>
      </div>

      <div className="mb-8">
        <AdSlot tier={user?.tier} />
      </div>

      {grouped.map(([category, items]) => (
        <div key={category} className="mb-10">
          <h2 className="mb-4 text-lg font-semibold text-gold-bright">
            {CATEGORY_LABELS[category] ?? category}
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {items.map((p) => (
              <div key={p.id} className="card-frame flex flex-col gap-2 p-3">
                <Link href={`/store/${p.id}`} className="group flex flex-col gap-2">
                  <ProductIcon icon={p.icon} />
                  <h3 className="text-sm font-semibold text-foreground group-hover:text-gold-bright">{p.name}</h3>
                </Link>
                <p className="line-clamp-2 text-xs text-muted">{p.description}</p>
                <p className="text-sm font-bold text-gold-bright">
                  {formatCents(p.priceCents)}
                </p>
                <AddToCartButton
                  productId={p.id}
                  name={p.name}
                  priceCents={p.priceCents}
                  icon={p.icon}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
    </>
  );
}
