import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import PageHeader from "@/components/PageHeader";
import ImportDeckPanel from "@/components/ImportDeckPanel";

export const metadata: Metadata = {
  title: "Import a Commander deck from Moxfield, Archidekt or Arena",
  description:
    "Bring your Commander decks to Mana Forge in seconds. Paste a decklist from Moxfield, Archidekt, MTG Arena or MTGO, or an Archidekt link. Free, no account needed to try.",
  alternates: { canonical: "/import" },
  openGraph: { images: ["/opengraph-image"],
    title: "Import your Commander decks · Mana Forge",
    description: "Paste a decklist from Moxfield, Archidekt, Arena or MTGO and keep building on Mana Forge. Free.",
  },
};

const HOW = [
  ["Moxfield", "Open the deck → More → Export → Copy for MTGA (or Copy plain text), then paste it here."],
  ["Archidekt", "Paste the deck's link (it has to be public), or Export → copy the text."],
  ["MTG Arena", "In the deck, click Export. The list is now copied; paste it here."],
  ["MTGO / anything else", "One card per line, like \"1 Sol Ring\". Put your commander under a line that says Commander."],
] as const;

export default async function ImportPage() {
  const session = await auth();
  const signedIn = !!session?.user?.id;
  return (
    <>
      <PageHeader
        title="Bring your decks over"
        description="Paste a list from Moxfield, Archidekt, Arena or MTGO. Your deck is ready to edit in a few seconds, with prices, mana curve and the cards other players run with your commander."
        width="max-w-5xl"
      />
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1fr_280px]">
        <div>
          <ImportDeckPanel signedIn={signedIn} />
          {!signedIn && (
            <p className="mt-3 text-xs text-muted">
              No account needed to try it. The deck stays in this browser until you{" "}
              <Link href="/signup?callbackUrl=/import" className="underline hover:text-gold-bright">
                make a free account
              </Link>{" "}
              to keep it.
            </p>
          )}
        </div>
        <aside className="flex flex-col gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Where to copy it from</h2>
          {HOW.map(([site, how]) => (
            <div key={site}>
              <p className="text-sm font-semibold text-foreground">{site}</p>
              <p className="text-xs leading-relaxed text-muted">{how}</p>
            </div>
          ))}
          <div className="border-t border-border pt-4 text-xs text-muted">
            Step-by-step guides:{" "}
            <Link href="/import/from/moxfield" className="underline hover:text-gold-bright">Moxfield</Link>{" · "}
            <Link href="/import/from/archidekt" className="underline hover:text-gold-bright">Archidekt</Link>{" · "}
            <Link href="/import/from/arena" className="underline hover:text-gold-bright">MTG Arena</Link>{" · "}
            <Link href="/import/from/mtgo" className="underline hover:text-gold-bright">MTGO</Link>{" · "}
            <Link href="/import/from/tappedout" className="underline hover:text-gold-bright">TappedOut</Link>.
          </div>
        </aside>
      </div>
    </>
  );
}
