import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import BreadcrumbLd from "@/components/BreadcrumbLd";
import { searchCards, cardImage } from "@/lib/scryfall";
import { findCategory, colorIdentityCategories, typalCategories, themeCategories } from "@/lib/categories";
import CategoryGuide from "@/components/CategoryGuide";

// EDHREC-ranked lists come from Scryfall at request time (cached a day); the build has no network.
export const revalidate = 86400;

// The categories that make good "best <X> commanders" search landing pages: colours, tribes,
// themes. Multi-commander mechanics, companions and products don't read as a "best of" query.
const BEST = [...colorIdentityCategories, ...typalCategories, ...themeCategories];
const BEST_SLUGS = new Set(BEST.map((c) => c.slug));
const isColor = (slug: string) => colorIdentityCategories.some((c) => c.slug === slug);

// Colours read as "Best <X> Commanders"; tribes and themes as "Best Commanders for <X>", which
// stays grammatical for plurals ("…for Dragons") and phrases ("…for +1/+1 Counters").
function headline(slug: string, label: string): string {
  const short = label.split(" (")[0];
  return isColor(slug) ? `Best ${short} Commanders` : `Best Commanders for ${short}`;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const cat = findCategory(slug);
  if (!cat || !BEST_SLUGS.has(slug)) return { title: "Commander not found", robots: { index: false, follow: false } };
  const h = headline(slug, cat.label);
  const path = `/commanders/best/${slug}`;
  const description = `The most-played ${cat.label} commanders in Magic: The Gathering Commander (EDH), ranked by deck count. See each one's top cards, a sample decklist and live prices, then build it free.`;
  return {
    title: `${h} (EDH)`,
    description,
    alternates: { canonical: path },
    openGraph: { images: ["/opengraph-image"], type: "article", title: h, description, url: path },
    twitter: { images: ["/twitter-image"], card: "summary_large_image", title: h, description },
  };
}

export default async function BestCommandersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cat = findCategory(slug);
  if (!cat || !BEST_SLUGS.has(slug)) notFound();
  const h = headline(slug, cat.label);

  // Scryfall's edhrec order is most-played first — exactly the "best / most popular" ranking.
  const res = await searchCards(cat.query, { order: "edhrec", dir: "asc", unique: "cards", page: 1 }).catch(() => null);
  const cards = (res?.data ?? []).slice(0, 40);
  const topCommanders = cards.slice(0, 3).map((c) => c.name.split(" // ")[0]);

  return (
    <>
      <PageHeader title={h} description={`The most-built ${cat.label} commanders right now, ranked by deck count on EDHREC.`} width="max-w-[1600px]" />
      <div className="mx-auto max-w-[1600px] px-4 py-10 sm:px-6">
        <BreadcrumbLd trail={[["Commanders", "/commanders"], [h, `/commanders/best/${slug}`]]} />
        <Link href="/commanders" className="text-xs text-muted underline hover:text-gold-bright">← All commanders</Link>
        <CategoryGuide slug={slug} label={cat.label} topCommanders={topCommanders} />

        {cards.length === 0 ? (
          <p className="mt-8 text-sm text-muted">Couldn&apos;t load this list just now — try again in a minute.</p>
        ) : (
          <ol className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
            {cards.map((c, i) => {
              const img = cardImage(c);
              const page = c.name.split(" // ")[0];
              return (
                <li key={c.id} className="card-frame flex flex-col p-2">
                  <Link href={`/decks/${encodeURIComponent(page)}`} className="group flex flex-1 flex-col">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt={c.name} className="aspect-[488/680] w-full rounded-md object-cover" loading="lazy" />
                    ) : (
                      <span className="aspect-[488/680] w-full rounded-md bg-surface-raised" />
                    )}
                    <span className="mt-2 truncate text-sm font-semibold text-foreground group-hover:text-gold-bright group-hover:underline">
                      <span className="mr-1 text-[11px] text-muted">{i + 1}.</span>
                      {c.name}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}

        <p className="mt-8 text-sm text-muted">
          Also see the{" "}
          <Link href="/commanders/popular" className="underline hover:text-gold-bright">most popular commanders this month</Link>{" "}
          and the{" "}
          <Link href="/commanders/budget" className="underline hover:text-gold-bright">best budget commanders</Link>.
        </p>
      </div>
    </>
  );
}
