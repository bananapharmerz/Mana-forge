import Link from "next/link";
import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import { getSpoilerSets, type ScryfallSet } from "@/lib/scryfall";

export const metadata: Metadata = {
  title: "MTG Spoilers & Upcoming Sets — every new card",
  description:
    "Track Magic: The Gathering spoilers and upcoming set releases. See every new card as it's previewed, release dates, and jump straight into building a Commander deck.",
  alternates: { canonical: "/spoilers" },
  openGraph: {
    images: ["/opengraph-image"],
    title: "MTG Spoilers & Upcoming Sets · Mana Forge",
    description: "Every new Magic: The Gathering card as it's spoiled, with release dates and one-click deck building.",
  },
};

// Set list is cached in the Scryfall lib (6h); revalidate the page on the same cadence.
export const revalidate = 21600;

function fmtDate(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function status(set: ScryfallSet): { label: string; upcoming: boolean } {
  if (!set.released_at) return { label: "Spoilers rolling out", upcoming: true };
  const when = new Date(set.released_at + "T00:00:00Z").getTime();
  const now = Date.now();
  if (when > now) return { label: `Releases ${fmtDate(set.released_at)}`, upcoming: true };
  return { label: `Released ${fmtDate(set.released_at)}`, upcoming: false };
}

function SetCard({ set }: { set: ScryfallSet }) {
  const s = status(set);
  return (
    <Link
      href={`/spoilers/${set.code.toLowerCase()}`}
      className="group flex items-center gap-4 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-gold"
    >
      {set.icon_svg_uri ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={set.icon_svg_uri} alt="" className="h-10 w-10 shrink-0 opacity-90 [filter:invert(85%)_sepia(25%)_saturate(600%)_hue-rotate(5deg)]" />
      ) : (
        <div className="h-10 w-10 shrink-0 rounded-full bg-surface-raised" />
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold text-foreground group-hover:text-gold-bright">{set.name}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
          <span className={s.upcoming ? "font-semibold text-gold-bright" : ""}>{s.label}</span>
          <span aria-hidden>·</span>
          <span className="uppercase">{set.code}</span>
          {set.card_count > 0 && (
            <>
              <span aria-hidden>·</span>
              <span>{set.card_count} cards{s.upcoming ? " so far" : ""}</span>
            </>
          )}
        </div>
      </div>
      <span className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-gold-bright">→</span>
    </Link>
  );
}

export default async function SpoilersPage() {
  const sets = await getSpoilerSets();
  const now = Date.now();
  const isUpcoming = (s: ScryfallSet) => !s.released_at || new Date(s.released_at + "T00:00:00Z").getTime() > now;
  const upcoming = sets.filter(isUpcoming);
  const recent = sets.filter((s) => !isUpcoming(s));

  return (
    <>
      <PageHeader
        title="MTG Spoilers & Upcoming Sets"
        description="Every new Magic: The Gathering card as it's previewed, plus release dates — click any set to see its full spoiler gallery and start brewing."
      />
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        {sets.length === 0 ? (
          <p className="text-muted">Couldn&apos;t load set data right now — please try again in a bit.</p>
        ) : (
          <>
            {upcoming.length > 0 && (
              <section className="mb-10">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gold-bright">Spoiling now & upcoming</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {upcoming.map((s) => (
                    <SetCard key={s.code} set={s} />
                  ))}
                </div>
              </section>
            )}
            {recent.length > 0 && (
              <section>
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">Recently released</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {recent.map((s) => (
                    <SetCard key={s.code} set={s} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </>
  );
}
