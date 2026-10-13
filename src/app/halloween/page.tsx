import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { SITE } from "@/lib/site";
import { TRIBES } from "@/lib/monsterMash";

const PATH = "/halloween";
const TITLE = "Monster Mash: Best Halloween Commander Decks";
const DESC =
  "Spooky-season MTG, sorted by tribe: the best vampire, werewolf, zombie, ghost and monster commanders to brew for Halloween — with decklists and prices on Mana Forge.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: PATH },
  openGraph: { images: ["/opengraph-image"], type: "article", title: TITLE, description: DESC, url: PATH },
  twitter: { images: ["/twitter-image"], card: "summary_large_image", title: TITLE, description: DESC },
};

export default function HalloweenPage() {
  const cmd = (name: string) => `/decks/${encodeURIComponent(name)}`;
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: TITLE,
    description: DESC,
    itemListElement: TRIBES.flatMap((t) => t.commanders).map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      url: `${SITE.url}${cmd(c.name)}`,
    })),
  };

  return (
    <>
      <PageHeader
        title="🎃 Monster Mash"
        description="Pick your horror and brew it. The best spooky-season Commander tribes — vampires, werewolves, zombies, ghosts and straight-up monsters — with real decklists and live prices."
        width="max-w-5xl"
      />
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList).replace(/</g, "\\u003c") }}
        />

        <div className="mb-10 flex flex-wrap gap-3">
          <Link href="/challenge" className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black transition hover:bg-gold-bright">
            Enter a Halloween challenge
          </Link>
          <Link href="/deck-builder" className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:border-gold">
            Build a spooky deck
          </Link>
          <Link href="/community" className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:border-gold">
            Share it in the community
          </Link>
        </div>

        <div className="flex flex-col gap-12">
          {TRIBES.map((t) => (
            <section key={t.id} id={t.id} className="scroll-mt-24">
              <div className="mb-3 border-l-4 pl-3" style={{ borderColor: t.accent }}>
                <h2 className="font-display text-2xl font-bold text-foreground">
                  <span className="mr-2">{t.emoji}</span>
                  {t.name}
                </h2>
                <p className="text-sm font-medium" style={{ color: t.accent }}>
                  {t.tagline}
                </p>
              </div>
              <p className="mb-5 max-w-3xl text-sm leading-relaxed text-muted">{t.blurb}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {t.commanders.map((c) => (
                  <Link
                    key={c.name}
                    href={cmd(c.name)}
                    className="group rounded-xl border border-border bg-white/[0.02] p-4 transition hover:border-gold"
                  >
                    <p className="font-display text-base font-semibold text-foreground group-hover:text-gold-bright">
                      {c.name} <span className="text-muted transition group-hover:text-gold-bright">&rarr;</span>
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-muted">{c.line}</p>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>

        <section className="mt-12 rounded-xl border border-border bg-white/[0.02] p-6">
          <h2 className="font-display text-xl font-bold text-foreground">Want something genuinely offbeat?</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
            Try{" "}
            <Link href={cmd("Reaper King")} className="font-semibold text-gold-bright underline">
              Reaper King
            </Link>
            , the five-colour Scarecrow king. Changelings count as Scarecrows, so every creature that enters blows up a
            permanent — the most on-theme removal engine in the game. It&apos;s the kind of brew the Monster Mash was made for.
          </p>
        </section>

        <section className="mt-10 border-t border-border pt-6 text-sm text-muted">
          <p>
            Every commander above links to its hub on {SITE.name} — top cards, real decklists and live prices. Found a build
            you love?{" "}
            <Link href="/community" className="underline hover:text-gold-bright">
              Post it in the community
            </Link>{" "}
            and see what the rest of the table is sleeving up this October.
          </p>
        </section>
      </div>
    </>
  );
}
