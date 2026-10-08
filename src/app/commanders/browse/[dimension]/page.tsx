import Link from "next/link";
import { notFound } from "next/navigation";
import BrowseSearchList, { type BrowseItem } from "@/components/BrowseSearchList";
import {
  colorIdentityCategories,
  typalCategories,
  themeCategories,
  multiCommanderCategories,
  companionCategories,
} from "@/lib/categories";
import { getCommanderSets } from "@/lib/scryfall";
import type { Metadata } from "next";


export const revalidate = 86400;

const DIMENSION_META: Record<string, { title: string; placeholder: string }> = {
  colors: { title: "Browse by Color Identity", placeholder: "Search color identities..." },
  typal: { title: "Browse by Typal", placeholder: "Search tribes..." },
  themes: { title: "Browse by Theme", placeholder: "Search themes..." },
  "multi-commander": {
    title: "Browse Partners & Companions",
    placeholder: "Search partner mechanics and companions...",
  },
  sets: { title: "Browse by Set", placeholder: "Search sets..." },
};

export async function generateMetadata({ params }: { params: Promise<{ dimension: string }> }): Promise<Metadata> {
  const { dimension } = await params;
  const meta = DIMENSION_META[dimension];
  if (!meta) return { title: "Browse commanders" };
  return {
    title: `${meta.title.replace(/^Browse by /, "Commanders by ")}`,
    description: `${meta.title} — every Magic: The Gathering commander, grouped so you can find your next deck.`,
    alternates: { canonical: `/commanders/browse/${dimension}` },
  };
}

export default async function BrowseDimensionPage({
  params,
  searchParams,
}: {
  params: Promise<{ dimension: string }>;
  searchParams: Promise<{ base?: string; active?: string }>;
}) {
  const { dimension } = await params;
  const { base: rawBase, active } = await searchParams;
  const meta = DIMENSION_META[dimension];
  if (!meta) notFound();

  // Only commanders and decks are ever valid link-back targets — anything else falls back to
  // commanders so this page can't be used to build an open redirect via a crafted ?base=.
  const base = rawBase === "/decks" ? "/decks" : "/commanders";
  const backLabel = base === "/decks" ? "Decks" : "Commanders";

  let items: BrowseItem[] = [];

  if (dimension === "colors") {
    items = colorIdentityCategories.map((c) => ({
      key: c.slug,
      label: c.label,
      href: c.slug === active ? base : `${base}?category=${c.slug}`,
      active: c.slug === active,
    }));
  } else if (dimension === "typal") {
    items = typalCategories.map((c) => ({
      key: c.slug,
      label: c.label,
      href: c.slug === active ? base : `${base}?category=${c.slug}`,
      active: c.slug === active,
    }));
  } else if (dimension === "themes") {
    items = themeCategories.map((c) => ({
      key: c.slug,
      label: c.label,
      href: c.slug === active ? base : `${base}?category=${c.slug}`,
      active: c.slug === active,
    }));
  } else if (dimension === "multi-commander") {
    // Companions only make sense when browsing commanders — no deck's commander is a companion.
    const list = base === "/decks" ? multiCommanderCategories : [...multiCommanderCategories, ...companionCategories];
    items = list.map((c) => ({
      key: c.slug,
      label: c.label,
      href: c.slug === active ? base : `${base}?category=${c.slug}`,
      active: c.slug === active,
    }));
  } else if (dimension === "sets") {
    const sets = await getCommanderSets();
    items = sets.map((s) => ({
      key: s.code,
      label: s.name,
      sublabel: s.released_at?.slice(0, 4),
      href: `/commanders?set=${s.code}&setName=${encodeURIComponent(s.name)}`,
    }));
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link href={base} className="text-xs text-muted underline hover:text-gold-bright">
        ← Back to {backLabel}
      </Link>
      <h1 className="mt-4 mb-6 text-2xl font-bold text-foreground">{meta.title}</h1>
      <BrowseSearchList items={items} placeholder={meta.placeholder} />
    </div>
  );
}
