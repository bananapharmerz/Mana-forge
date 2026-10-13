import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import BudgetList from "@/components/BudgetList";
import BudgetColorNav from "@/components/BudgetColorNav";
import { budgetColor, budgetCommanders } from "@/lib/budget";

// Prices come from Scryfall at request time (cached an hour); the build has no network to rely on.
export const dynamic = "force-dynamic";

function copy(slug: string) {
  const c = budgetColor(slug);
  if (!c) return null;
  const short = c.name.split(" (")[0];
  const title = `Best budget ${short} commanders`;
  const description = `The most-played ${c.name} Commander (EDH) commanders under $1 and under $5, ranked by popularity with live TCGplayer prices.`;
  return { c, short, title, description };
}

export async function generateMetadata({ params }: { params: Promise<{ color: string }> }): Promise<Metadata> {
  const { color } = await params;
  const k = copy(color);
  if (!k) return { title: "Budget commanders", robots: { index: false } };
  const path = `/commanders/budget/${k.c.slug}`;
  return {
    title: k.title,
    description: k.description,
    alternates: { canonical: path },
    openGraph: { images: ["/opengraph-image"], type: "article", title: k.title, description: k.description, url: path },
    twitter: { images: ["/twitter-image"], card: "summary_large_image", title: k.title, description: k.description },
  };
}

export default async function BudgetColorPage({ params }: { params: Promise<{ color: string }> }) {
  const { color } = await params;
  const k = copy(color);
  if (!k) notFound();
  const tiers = await budgetCommanders(k.c.id);
  return (
    <>
      <PageHeader title={k.title} description={`Popular ${k.c.name} commanders that cost less than a coffee.`} width="max-w-6xl" />
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <BudgetColorNav current={k.c.slug} />
        <BudgetList tiers={tiers} href={(name) => `/decks/${encodeURIComponent(name)}`} />
        <p className="mt-8 text-sm text-muted">
          Need cheap cards to go with it? See the{" "}
          <Link href="/prices/budget-staples" className="underline hover:text-gold-bright">best budget staples</Link>, or build it
          for the <Link href="/challenge" className="underline hover:text-gold-bright">$50 deck challenge</Link>.
        </p>
      </div>
    </>
  );
}
