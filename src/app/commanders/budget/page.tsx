import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import BudgetList from "@/components/BudgetList";
import BudgetColorNav from "@/components/BudgetColorNav";
import { budgetCommanders } from "@/lib/budget";

// Prices come from Scryfall at request time (cached an hour); the build has no network to rely on.
export const dynamic = "force-dynamic";

const title = "Best budget commanders";
const description =
  "The most-played Commander (EDH) commanders under $1 and under $5, ranked by popularity with live TCGplayer prices. Pick one and build the deck free.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/commanders/budget" },
  openGraph: { type: "article", title, description, url: "/commanders/budget" },
  twitter: { card: "summary_large_image", title, description },
};

export default async function BudgetCommandersPage() {
  const tiers = await budgetCommanders();
  return (
    <>
      <PageHeader title={title} description="Popular commanders that cost less than a coffee, ranked by how often people build them." width="max-w-6xl" />
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <p className="mb-8 max-w-2xl text-sm text-muted">
          A cheap commander doesn&apos;t mean a weak deck. Open any of these to see the cards other players run with it, then
          build it with a budget in mind, or enter it in the{" "}
          <Link href="/challenge" className="underline hover:text-gold-bright">$50 deck challenge</Link>.
        </p>
        <BudgetColorNav />
        <BudgetList tiers={tiers} href={(name) => `/decks/${encodeURIComponent(name)}`} />
        <p className="mt-8 text-sm text-muted">
          Need cheap cards to go with it? See the{" "}
          <Link href="/prices/budget-staples" className="underline hover:text-gold-bright">best budget staples</Link>.
        </p>
      </div>
    </>
  );
}
