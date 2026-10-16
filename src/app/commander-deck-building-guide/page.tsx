import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { SITE } from "@/lib/site";

const title = "How to Build a Commander Deck — a beginner's guide";
const description =
  "A simple, step-by-step guide to building your first Commander (EDH) deck: pick a commander, the 100-card rules, how many lands, ramp, draw and removal to run, and a free builder to do it in.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/commander-deck-building-guide" },
  openGraph: { images: ["/opengraph-image"], type: "article", title, description, url: "/commander-deck-building-guide" },
  twitter: { images: ["/twitter-image"], card: "summary_large_image", title, description },
};

// A well-known, community-standard starting template for a 99-card Commander deck. These are
// guidelines, not rules — the point is to give a beginner a shape to fill in and adjust.
const TEMPLATE: { n: string; label: string }[] = [
  { n: "37", label: "Lands" },
  { n: "10", label: "Ramp" },
  { n: "10", label: "Card draw" },
  { n: "10", label: "Removal" },
  { n: "3", label: "Board wipes" },
  { n: "~29", label: "Theme & win-cons" },
];

const STEPS: { title: string; body: React.ReactNode }[] = [
  {
    title: "Pick your commander",
    body: (
      <>
        Everything starts with one legendary creature. Your commander sits in the command zone, you can always cast it,
        and its <strong>color identity</strong> decides which cards the rest of the deck may use. Pick one whose ability
        sounds fun to build around.{" "}
        <Link href="/commanders" className="underline hover:text-gold-bright">Browse every commander</Link> by color,
        tribe or theme, or start from the{" "}
        <Link href="/commanders/popular" className="underline hover:text-gold-bright">most popular ones this month</Link>.
      </>
    ),
  },
  {
    title: "Know the three rules",
    body: (
      <>
        Commander has three that shape every deck: <strong>100 cards total</strong> (your commander plus 99);{" "}
        <strong>singleton</strong> — one copy of each card, except basic lands; and everything must fit inside your{" "}
        <strong>commander&apos;s color identity</strong> (the colors in its mana cost and rules text). You start at 40
        life, and 21 combat damage from a single commander also knocks a player out.
      </>
    ),
  },
  {
    title: "See what already works",
    body: (
      <>
        Don&apos;t build from a blank page. Open your commander&apos;s page to see the cards other players actually run
        with it, pulled from community deck data — the staples, the synergy pieces and the typical win conditions. It&apos;s
        the fastest way to find the 60-70 cards that almost pick themselves, so you can spend your energy on the fun
        choices. Every commander on{" "}
        <Link href="/commanders" className="underline hover:text-gold-bright">Mana Forge</Link> has one.
      </>
    ),
  },
  {
    title: "Fill the 99 with a template",
    body: (
      <>
        A reliable deck needs more than a theme — it needs mana, cards and answers. The community-standard starting split
        below keeps you from the two classic beginner mistakes: too few lands, and no way to interact with the table.
        Treat it as a shape to adjust, not a law. Once you&apos;ve got your commander&apos;s synergy cards, backfill the
        rest to roughly these numbers.
      </>
    ),
  },
  {
    title: "Watch the curve and the cost",
    body: (
      <>
        Keep your average mana value low enough to actually cast your spells — most decks want the bulk of the deck at
        five mana or less. And keep an eye on price: a great deck doesn&apos;t have to be expensive.{" "}
        <Link href="/commanders/budget" className="underline hover:text-gold-bright">Budget commanders</Link> and{" "}
        <Link href="/prices/budget-staples" className="underline hover:text-gold-bright">budget staples</Link> get you a
        long way, and every deck here shows a live total so you catch a card before it spikes.
      </>
    ),
  },
  {
    title: "Test it, then tune it",
    body: (
      <>
        Your first list is a draft. Play a few games, notice what sits dead in your hand and what you&apos;re always glad
        to draw, then cut the under-performers for more lands, ramp or removal.{" "}
        <Link href="/play" className="underline hover:text-gold-bright">Play online with friends</Link> on a shared
        virtual tabletop, or just goldfish it solo in the builder until it hums.
      </>
    ),
  },
];

export default function CommanderDeckGuidePage() {
  const howTo = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to build a Commander (EDH) deck",
    description,
    step: STEPS.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.title })),
  };

  return (
    <>
      <PageHeader
        title="How to build a Commander deck"
        description="New to Commander (EDH)? Here's the whole thing in six steps — pick a commander, follow a proven deck template, and build it free. No experience needed."
        width="max-w-3xl"
      />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(howTo).replace(/</g, "\\u003c") }}
        />

        <ol className="flex flex-col gap-8">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold text-sm font-bold text-black">
                {i + 1}
              </span>
              <div className="min-w-0">
                <h2 className="font-display text-xl font-semibold text-foreground">{s.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>

                {/* The template numbers live inside step 4 so the shape sits with its explanation. */}
                {i === 3 && (
                  <div className="mt-4 rounded-xl border border-border bg-surface p-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
                      A starting 99-card template
                    </p>
                    <dl className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                      {TEMPLATE.map((t) => (
                        <div key={t.label} className="text-center">
                          <dt className="font-display text-2xl font-semibold text-gold-bright">{t.n}</dt>
                          <dd className="text-[11px] leading-tight text-muted">{t.label}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-12 rounded-2xl border border-border bg-surface p-6 text-center sm:p-8">
          <h2 className="font-display text-2xl font-semibold text-foreground">Ready to build?</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-muted">
            Pick a commander and {SITE.name} shows you what to run, prices the deck as you go, and lets you play it online —
            free, no account needed to start.
          </p>
          <Link
            href="/deck-builder"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-gold-bright"
          >
            Start building, it&apos;s free →
          </Link>
        </div>
      </div>
    </>
  );
}
