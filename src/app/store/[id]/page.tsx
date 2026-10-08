import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { SITE } from "@/lib/site";
import { formatCents } from "@/lib/money";
import ProductIcon from "@/components/ProductIcon";
import ProductShowcase from "@/components/forge3d/ProductShowcase";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const p = await db.product.findUnique({ where: { id } });
  if (!p) return { title: "Product not found", robots: { index: false } };
  return {
    title: `${p.name} — Store`,
    description: p.description.slice(0, 160) || `${p.name} from the ${SITE.name} store.`,
    alternates: { canonical: `/store/${p.id}` },
    openGraph: { title: p.name, description: p.description.slice(0, 160), url: `/store/${p.id}`, images: [{ url: "/opengraph-image", width: 1200, height: 630 }] },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await db.product.findUnique({ where: { id } });
  if (!product) notFound();
  const more = (await db.product.findMany({ where: { id: { not: product.id } }, orderBy: { priceCents: "desc" }, take: 4 })) ?? [];

  // Lets Google show the price and stock next to the product in search results.
  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    sku: product.id,
    brand: { "@type": "Brand", name: SITE.name },
    url: `${SITE.url}/store/${product.id}`,
    offers: {
      "@type": "Offer",
      price: (product.priceCents / 100).toFixed(2),
      priceCurrency: "USD",
      availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${SITE.url}/store/${product.id}`,
    },
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd).replace(/</g, "\\u003c") }} />
      <ProductShowcase
        product={{ id: product.id, name: product.name, description: product.description, priceCents: product.priceCents, category: product.category, icon: product.icon, stock: product.stock }}
      />
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-3xl font-semibold text-foreground">More from the store</h2>
          <Link href="/store" className="text-sm font-medium text-gold-bright hover:underline">
            ← All products
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {more.map((p) => (
            <Link key={p.id} href={`/store/${p.id}`} className="card-frame flex flex-col gap-2 p-3 transition-colors hover:border-gold">
              <ProductIcon icon={p.icon} />
              <h3 className="text-sm font-semibold text-foreground">{p.name}</h3>
              <p className="text-sm font-bold text-gold-bright">{formatCents(p.priceCents)}</p>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
