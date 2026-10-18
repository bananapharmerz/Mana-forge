import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { ARTICLES } from "@/lib/articles";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Articles & guides",
  description: `Original Commander (EDH) deck-building guides, budget breakdowns and strategy from ${SITE.name} — straight talk, no filler.`,
  alternates: { canonical: "/articles" },
};

const fmtDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export default function ArticlesPage() {
  return (
    <>
      <PageHeader
        title="Articles & guides"
        description="Deck-building, budget and strategy writing for Magic: The Gathering Commander (EDH)."
        width="max-w-3xl"
      />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-4">
          {ARTICLES.map((a) => (
            <Link key={a.slug} href={`/articles/${a.slug}`} className="card-frame block p-5 transition-colors hover:border-gold">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                <span className="rounded-full bg-gold/15 px-2 py-0.5 font-semibold text-gold-bright">{a.category}</span>
                <span>{fmtDate(a.date)}</span>
                <span>· {a.readMins} min read</span>
              </div>
              <h2 className="mt-2 font-display text-xl font-semibold text-foreground">{a.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted">{a.description}</p>
              <span className="mt-3 inline-block text-sm font-semibold text-gold hover:text-gold-bright">Read →</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
