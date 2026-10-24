import Image from "next/image";
import Link from "next/link";
import { cardImage, type ScryfallCard } from "@/lib/scryfall";

// "Didn't click with this one? Try these." A visitor who isn't sold on the commander they landed on
// gets a next step instead of the back button. The list is EDHREC's own similar-commanders pick
// (already in the data the page loads) and the cards come from the page's one batched Scryfall
// lookup, so this row costs no extra requests. Card images stay free to view, whole and uncropped.
export default function SimilarCommanders({
  names,
  byName,
}: {
  names: string[];
  byName: Map<string, ScryfallCard>;
}) {
  const picks = names
    .map((n) => byName.get(n))
    .filter((c): c is ScryfallCard => !!c && !!cardImage(c))
    .slice(0, 6);
  if (picks.length === 0) return null;

  return (
    <div id="similar-commanders" className="mt-12 scroll-mt-28">
      <h2 className="mb-1 text-xl font-bold text-foreground">Similar commanders</h2>
      <p className="mb-4 text-xs text-muted">Not quite your style? These play in a similar way.</p>
      {/* Phones scroll sideways through the row; bigger screens show it as a grid. */}
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 md:grid-cols-6">
        {picks.map((c) => (
          <div key={c.name} className="flex w-36 shrink-0 snap-start flex-col gap-2 sm:w-auto">
            <Link
              href={`/decks/${encodeURIComponent(c.name)}`}
              className="card-frame block overflow-hidden transition-transform hover:-translate-y-0.5"
            >
              <Image src={cardImage(c)!} alt={c.name} width={244} height={340} className="w-full" />
            </Link>
            <Link
              href={`/decks/${encodeURIComponent(c.name)}`}
              className="line-clamp-2 text-sm font-semibold text-foreground hover:text-gold"
            >
              {c.name}
            </Link>
            <Link
              href={`/deck-builder?commander=${encodeURIComponent(c.name)}`}
              className="mt-auto rounded-md border border-gold/50 px-3 py-1.5 text-center text-xs font-semibold text-foreground hover:border-gold hover:bg-gold/10"
            >
              Build it
            </Link>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-muted">Similar commanders via EDHREC. Card images via Scryfall.</p>
    </div>
  );
}
