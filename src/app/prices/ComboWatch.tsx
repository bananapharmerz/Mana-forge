import Link from "next/link";
import { comboPiecesToWatch } from "@/lib/comboWatch";
import { usd } from "@/lib/livePrice";
import WatchButton from "./card/[id]/WatchButton";

// Combo pieces for this month's most-built commanders (see lib/comboWatch.ts). Free for everyone;
// the Watch button is the normal watchlist, so its usual free limits apply. Rendered inside a
// Suspense boundary so a slow Spellbook never holds up the rest of /prices.
export default async function ComboWatch({ signedIn, watching }: { signedIn: boolean; watching: string[] }) {
  const pieces = await comboPiecesToWatch();
  if (!pieces.length) return null;
  const watched = new Set(watching);
  return (
    <section className="mt-10" aria-labelledby="combo-watch">
      <h2 id="combo-watch" className="font-display text-2xl font-semibold text-foreground">Combo pieces to watch</h2>
      <p className="mt-1 mb-3 text-sm text-muted">
        Each card here finishes a two-card combo with one of this month&apos;s most-built commanders. Cards like these sometimes move once players find the combo. That&apos;s a heads-up, not a forecast.
      </p>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {pieces.map((p) => (
          <li key={p.scryfallId} className="card-frame flex flex-col gap-2 p-3 text-sm">
            <div className="flex items-center gap-3">
              {p.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.imageUrl} alt="" className="h-14 w-10 shrink-0 rounded-sm object-cover object-top" loading="lazy" />
              ) : (
                <span className="h-14 w-10 shrink-0 rounded-sm bg-surface-raised" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-foreground">{p.name}</span>
                <span className="block font-mono text-gold-bright">{p.usd !== null ? usd(p.usd) : "—"}</span>
              </span>
            </div>
            <p className="text-[11px] text-muted">
              With{" "}
              <Link href={`/decks/${encodeURIComponent(p.commander)}`} className="text-gold-bright hover:underline">
                {p.commander}
              </Link>
              {p.produces.length > 0 && <>: {p.produces.join(", ")}</>}
            </p>
            {signedIn && (
              <div className="mt-auto">
                <WatchButton scryfallId={p.scryfallId} name={p.name} signedIn watching={watched.has(p.scryfallId)} />
              </div>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] text-muted">
        Combos from{" "}
        <a href="https://commanderspellbook.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
          Commander Spellbook
        </a>
        , commanders from EDHREC&apos;s monthly list, prices from Scryfall. Updated once a day.
        {!signedIn && (
          <>
            {" "}
            <Link href="/signup?callbackUrl=/prices" className="font-semibold text-gold-bright underline">Create a free account</Link> to watch any of them.
          </>
        )}
      </p>
    </section>
  );
}
