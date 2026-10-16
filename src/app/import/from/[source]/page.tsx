import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import PageHeader from "@/components/PageHeader";
import ImportDeckPanel from "@/components/ImportDeckPanel";
import { SITE } from "@/lib/site";
import { MIGRATION_SLUGS, getMigration } from "@/lib/migrations";

export function generateStaticParams() {
  return MIGRATION_SLUGS.map((source) => ({ source }));
}

export async function generateMetadata({ params }: { params: Promise<{ source: string }> }): Promise<Metadata> {
  const { source } = await params;
  const m = getMigration(source);
  if (!m) return { title: "Import a deck", robots: { index: false } };
  const path = `/import/from/${m.slug}`;
  return {
    title: m.title,
    description: m.description,
    alternates: { canonical: path },
    openGraph: { images: ["/opengraph-image"], type: "article", title: m.title, description: m.description, url: path },
    twitter: { images: ["/twitter-image"], card: "summary_large_image", title: m.title, description: m.description },
  };
}

// What Mana Forge adds once a deck is in — all verifiable on the site itself.
const PERKS: [string, string][] = [
  ["See what your deck is worth", "Live card prices and a value chart that tracks your deck over time, so you catch a card before it spikes."],
  ["Built commander-first", "Open any commander and see the cards other players actually run with it, pulled from community play data."],
  ["Free to build and share", "Make and share full 100-card decks for free. No account needed to try an import."],
  ["More than a list", "Price movers, the $50 deck challenge, and playing online with friends — all in one place."],
];

export default async function MigrationPage({ params }: { params: Promise<{ source: string }> }) {
  const { source } = await params;
  const m = getMigration(source);
  if (!m) notFound();

  const session = await auth();
  const signedIn = !!session?.user?.id;

  const howTo = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: `How to import a Commander deck from ${m.name} to ${SITE.name}`,
    description: m.description,
    step: m.steps.map((text, i) => ({ "@type": "HowToStep", position: i + 1, text })),
  };

  return (
    <>
      <PageHeader
        title={m.heading ?? `Switching from ${m.name}?`}
        description={m.intro}
        width="max-w-5xl"
      />
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(howTo).replace(/</g, "\\u003c") }}
        />
        <div className="grid gap-8 md:grid-cols-[1fr_280px]">
          <div>
            <h2 className="mb-3 font-display text-xl font-semibold text-foreground">
              Bring your {m.name} deck over in about 30 seconds
            </h2>
            <ol className="mb-6 flex flex-col gap-2">
              {m.steps.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-foreground">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold text-[11px] font-bold text-black">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>

            <ImportDeckPanel signedIn={signedIn} />
            {!signedIn && (
              <p className="mt-3 text-xs text-muted">
                No account needed to try it. The deck stays in this browser until you{" "}
                <Link href={`/signup?callbackUrl=/import/from/${m.slug}`} className="underline hover:text-gold-bright">
                  make a free account
                </Link>{" "}
                to keep it.
              </p>
            )}
            <p className="mt-4 text-xs text-muted">{m.note}</p>
          </div>

          <aside className="flex flex-col gap-5">
            <div>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
                What you get on {SITE.name}
              </h2>
              <div className="flex flex-col gap-4">
                {PERKS.map(([title, body]) => (
                  <div key={title}>
                    <p className="text-sm font-semibold text-foreground">{title}</p>
                    <p className="text-xs leading-relaxed text-muted">{body}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-border pt-4 text-xs text-muted">
              <p>
                Coming from somewhere else? The{" "}
                <Link href="/import" className="underline hover:text-gold-bright">
                  main import page
                </Link>{" "}
                takes lists from Arena, MTGO and more.
              </p>
              <p className="mt-3">
                Just want commander recommendations? See our{" "}
                <Link href="/edhrec-alternative" className="underline hover:text-gold-bright">
                  free EDHREC alternative
                </Link>
                .
              </p>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
