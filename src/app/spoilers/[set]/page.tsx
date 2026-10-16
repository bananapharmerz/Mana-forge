import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { getSet, searchCards, cardImage, type ScryfallCard, type ScryfallSet } from "@/lib/scryfall";

// Set data + card list are cached in the Scryfall lib; revalidate the page on the same 6h cadence
// so a freshly-spoiled card shows up without a redeploy.
export const revalidate = 21600;

function fmtDate(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function statusLine(set: ScryfallSet): string {
  if (!set.released_at) return "Spoilers rolling out now";
  const when = new Date(set.released_at + "T00:00:00Z").getTime();
  if (when > Date.now()) return `Releases ${fmtDate(set.released_at)}`;
  return `Released ${fmtDate(set.released_at)}`;
}

// Pull the full set, newest previews first. Scryfall pages 175 cards at a time; cap at 5 pages
// (875 cards) so even the biggest set is covered without hammering the API.
async function getSetCards(code: string): Promise<ScryfallCard[]> {
  const out: ScryfallCard[] = [];
  for (let page = 1; page <= 5; page++) {
    const res = await searchCards(`e:${code} unique:cards`, {
      order: "spoiled",
      dir: "desc",
      page,
      unique: "cards",
    }).catch(() => null);
    if (!res || res.data.length === 0) break;
    out.push(...res.data);
    if (!res.has_more) break;
  }
  return out;
}

export async function generateMetadata({ params }: { params: Promise<{ set: string }> }): Promise<Metadata> {
  const { set: code } = await params;
  const set = await getSet(code);
  if (!set) return { title: "Set not found · Mana Forge" };
  const canonical = `/spoilers/${set.code.toLowerCase()}`;
  const title = `${set.name} Spoilers — every card revealed`;
  const description = `Every ${set.name} (${set.code.toUpperCase()}) card spoiled so far, with full images and release date. Browse the full gallery and build a Commander deck from the new set.`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${set.name} Spoilers · Mana Forge`,
      description,
      images: ["/opengraph-image"],
    },
  };
}

function SpoilerCard({ card }: { card: ScryfallCard }) {
  const img = cardImage(card);
  return (
    <a
      href={card.scryfall_uri}
      target="_blank"
      rel="noopener nofollow"
      className="group block"
      title={card.name}
    >
      <div className="relative aspect-[488/680] overflow-hidden rounded-xl bg-surface-raised ring-1 ring-border transition group-hover:ring-gold group-hover:shadow-lg group-hover:shadow-black/30">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={card.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-3 text-center text-xs text-muted">
            {card.name}
          </div>
        )}
      </div>
    </a>
  );
}

export default async function SetSpoilerPage({ params }: { params: Promise<{ set: string }> }) {
  const { set: code } = await params;
  const set = await getSet(code);
  if (!set) notFound();

  const cards = await getSetCards(set.code);
  const setParam = encodeURIComponent(set.code.toUpperCase());
  const nameParam = encodeURIComponent(set.name);
  // Precon/Commander sets are literally named "… Commander", so appending "Commander deck" would
  // read "Star Trek Commander Commander deck". Drop a trailing "Commander" for the deck CTAs.
  const shortName = set.name.replace(/\s+Commander$/i, "");

  return (
    <>
      <PageHeader
        title={`${set.name} Spoilers`}
        description={`Every ${shortName} card revealed so far. ${statusLine(set)} · ${set.code.toUpperCase()}${cards.length > 0 ? ` · ${cards.length} revealed` : ""}`}
      >
        <Link
          href={`/commanders?set=${setParam}&setName=${nameParam}`}
          className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-gold-bright"
        >
          Build a {shortName} Commander deck →
        </Link>
      </PageHeader>

      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 sm:py-10">
        <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <Link href="/spoilers" className="text-muted transition-colors hover:text-gold-bright">
            ← All spoilers &amp; upcoming sets
          </Link>
        </div>

        {cards.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-8 text-center">
            <p className="text-lg font-semibold text-foreground">No cards previewed yet</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              {set.name} hasn&apos;t started spoiling cards yet{set.released_at ? `, but it's on the way — ${statusLine(set).toLowerCase()}.` : "."} Check back soon, or browse sets that are already revealing.
            </p>
            <Link
              href="/spoilers"
              className="mt-5 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-gold hover:text-gold-bright"
            >
              See what&apos;s spoiling now
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {cards.map((card) => (
                <SpoilerCard key={card.id} card={card} />
              ))}
            </div>

            <div className="mt-12 rounded-2xl border border-border bg-surface p-6 text-center sm:p-8">
              <h2 className="font-display text-2xl font-semibold text-foreground">
                Found your next commander in {set.name}?
              </h2>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-muted">
                Jump straight into the brew — browse every {shortName} commander, filter by color and theme, and build a full deck on Mana Forge, free.
              </p>
              <Link
                href={`/commanders?set=${setParam}&setName=${nameParam}`}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-gold-bright"
              >
                Browse {shortName} commanders →
              </Link>
            </div>
          </>
        )}
      </div>
    </>
  );
}
