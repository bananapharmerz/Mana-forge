import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { topCommandersThisMonth } from "@/lib/topCommanders";

// EDHREC's list is fetched at request time (cached six hours); the build has no network to rely on.
export const dynamic = "force-dynamic";

const title = "Most popular commanders this month";
const description =
  "The 50 most-built Commander (EDH) commanders over the past month, ranked by new decks on EDHREC. Open any one to see what players run with it and build it free.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/commanders/popular" },
  openGraph: { images: ["/opengraph-image"], type: "article", title, description, url: "/commanders/popular" },
  twitter: { images: ["/twitter-image"], card: "summary_large_image", title, description },
};

export default async function PopularCommandersPage() {
  const top = await topCommandersThisMonth(50);
  return (
    <>
      <PageHeader title={title} description="What the Commander community is building right now, updated daily." width="max-w-[1600px]" />
      <div className="mx-auto max-w-[1600px] px-4 py-10 sm:px-6">
        {top.length === 0 ? (
          <p className="text-sm text-muted">The list couldn&apos;t be loaded just now. Try again in a minute.</p>
        ) : (
          <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
            {top.map((c) => (
              <li key={c.name} className="card-frame flex flex-col p-2">
                <Link href={`/decks/${encodeURIComponent(c.page)}`} className="group flex flex-1 flex-col">
                  {c.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.image} alt={c.name} className="aspect-[488/680] w-full rounded-md object-cover" loading="lazy" />
                  ) : (
                    <span className="aspect-[488/680] w-full rounded-md bg-surface-raised" />
                  )}
                  <span className="mt-2 truncate text-sm font-semibold text-foreground group-hover:text-gold-bright group-hover:underline">
                    <span className="mr-1 text-[11px] text-muted">{c.rank}.</span>
                    {c.name}
                  </span>
                  <span className="text-[11px] text-muted">{c.decks.toLocaleString("en-US")} new decks this month</span>
                </Link>
              </li>
            ))}
          </ol>
        )}
        <p className="mt-8 text-xs text-muted">
          Ranked by decks built in the past month, from EDHREC&apos;s public data. Card images via Scryfall.
        </p>
        <p className="mt-4 text-sm text-muted">
          On a budget? See the{" "}
          <Link href="/commanders/budget" className="underline hover:text-gold-bright">best budget commanders</Link>.
        </p>
      </div>
    </>
  );
}
