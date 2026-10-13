import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import BudgetList from "@/components/BudgetList";
import { budgetStaples } from "@/lib/budget";

// Prices come from Scryfall at request time (cached an hour); the build has no network to rely on.
export const dynamic = "force-dynamic";

const title = "Best budget Commander staples";
const description =
  "The most-played Commander (EDH) cards under 25¢ and under $1, ranked by popularity with live TCGplayer prices. Cheap upgrades for any deck.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/prices/budget-staples" },
  openGraph: { images: ["/opengraph-image"], type: "article", title, description, url: "/prices/budget-staples" },
  twitter: { images: ["/twitter-image"], card: "summary_large_image", title, description },
};

export default async function BudgetStaplesPage() {
  const tiers = await budgetStaples();
  return (
    <>
      <PageHeader title={title} description="The cheapest cards that show up in the most Commander decks." width="max-w-6xl" />
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <p className="mb-8 max-w-2xl text-sm text-muted">
          Every card here costs a dollar or less and is among the most-played in the format. Tap one to compare its printings&apos;
          prices, or add it to your{" "}
          <Link href="/prices" className="underline hover:text-gold-bright">watchlist</Link> to catch it before it moves.
        </p>
        <BudgetList tiers={tiers} href={(name) => `/prices?q=${encodeURIComponent(name)}`} />
        <p className="mt-8 text-sm text-muted">
          Still need a commander? See the{" "}
          <Link href="/commanders/budget" className="underline hover:text-gold-bright">best budget commanders</Link>.
        </p>
      </div>
    </>
  );
}
