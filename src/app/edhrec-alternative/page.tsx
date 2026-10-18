import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";

const title = "Free EDHREC alternative — commander data, decks & prices";
const description =
  "Looking for a free EDHREC alternative? Mana Forge shows the cards players run with any commander, ranked by real deck data — then lets you build, price and play the deck, all in one place. Free to try.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/edhrec-alternative" },
  openGraph: { images: ["/opengraph-image"], type: "article", title, description, url: "/edhrec-alternative" },
  twitter: { images: ["/twitter-image"], card: "summary_large_image", title, description },
};

const FEATURES: { title: string; body: string; href: string; cta: string }[] = [
  {
    title: "Top cards for any commander",
    body: "Open any commander and see the cards other players actually run with it, from community deck data — the EDHREC view you came for.",
    href: "/commanders",
    cta: "Browse commanders",
  },
  {
    title: "Browse by colour, tribe & theme",
    body: "Find your next commander by colour identity, tribe or strategy, with a ranked “best of” list for each.",
    href: "/commanders/browse/typal",
    cta: "Browse by tribe",
  },
  {
    title: "The most popular commanders",
    body: "See what the Commander community is building right now, ranked by new decks this month.",
    href: "/commanders/popular",
    cta: "See what’s popular",
  },
  {
    title: "What a deck is worth",
    body: "Every card carries a live price and every deck a running value — something a stats site alone doesn’t give you.",
    href: "/prices",
    cta: "See prices",
  },
];

export default function EdhrecAlternativePage() {
  return (
    <>
      <PageHeader
        title="A free EDHREC alternative"
        description="EDHREC is the go-to for Commander data, and Mana Forge draws on the same community deck data. The difference: here you go straight from “what do people run with this commander” to building, pricing and playing the deck — in one place."
        width="max-w-5xl"
      />
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="grid gap-5 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.title} className="card-frame flex flex-col gap-2 p-5">
              <h2 className="font-display text-lg font-semibold text-foreground">{f.title}</h2>
              <p className="flex-1 text-sm leading-relaxed text-muted">{f.body}</p>
              <Link href={f.href} className="mt-1 text-sm font-semibold text-gold hover:text-gold-bright">
                {f.cta} →
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-border bg-surface p-6 text-center sm:p-8">
          <h2 className="font-display text-2xl font-semibold text-foreground">Go from browsing to building</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted">
            EDHREC tells you what to play. Mana Forge lets you build the 100-card deck, see what it costs, and play it
            online with friends — free.
          </p>
          <Link
            href="/deck-builder"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-gold-bright"
          >
            Start building, it&apos;s free →
          </Link>
        </div>

        <p className="mt-8 max-w-2xl text-xs leading-relaxed text-muted">
          EDHREC is a fantastic free resource, and a lot of the community data here comes from the same place. This
          isn&apos;t a knock on it — just a home for players who want the recommendations, a real deck builder, live
          prices and online play together.
        </p>
      </div>
    </>
  );
}
