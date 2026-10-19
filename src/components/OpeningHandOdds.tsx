"use client";

import { useMemo, useState } from "react";
import PremiumLockedPreview from "@/components/PremiumLockedPreview";
import type { DeckCard } from "@/lib/deckTypes";
import { atLeastOne, landsBetween, seenByTurnOnPlay } from "@/lib/handOdds";

const pct = (p: number) => `${Math.round(p * 100)}%`;
// Front face only, so a spell // land MDFC counts as the spell (the safe guess for a keepable hand).
const isLand = (c: DeckCard) => /\bLand\b/.test(c.typeLine.split(" // ")[0]);

// Draw odds in the deck builder. The land line is free for everyone; ramp and "a card you pick"
// are Premium. For free players the real Premium numbers are never worked out or put in the
// page: the locked box shows made-up sample rows instead.
export default function OpeningHandOdds({ cards, locked }: { cards: DeckCard[]; locked: boolean }) {
  // The library is everything but the commanders (they start in the command zone) and tokens.
  const library = useMemo(() => cards.filter((c) => c.category !== "Tokens"), [cards]);
  const size = library.reduce((n, c) => n + c.quantity, 0);
  const lands = library.reduce((n, c) => n + (isLand(c) ? c.quantity : 0), 0);
  // Ramp only counts when the player has made a Ramp category themselves; we don't guess it
  // from card text, because a wrong guess would make the number look precise but mean nothing.
  const ramp = library.reduce((n, c) => n + (/ramp/i.test(c.category) ? c.quantity : 0), 0);
  const picks = useMemo(
    () => [...new Set(library.filter((c) => !isLand(c)).map((c) => c.name))].sort((a, b) => a.localeCompare(b)),
    [library],
  );
  const [pick, setPick] = useState("");
  const chosen = picks.includes(pick) ? pick : picks[0] ?? "";

  if (size < 7) return null;

  const pickCount = library.reduce((n, c) => n + (c.name === chosen ? c.quantity : 0), 0);

  return (
    <div className="card-frame mt-4 p-4">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Opening hand odds</h3>
      <p className="text-sm text-foreground">
        <span className="text-xl font-bold">{pct(landsBetween(size, lands, 2, 4))}</span> chance of 2-4 lands in your opening 7
      </p>
      <p className="text-[11px] text-muted">
        {lands} lands in {size} cards
      </p>

      <div className="mt-3">
        <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
          More odds <span className="text-gold-bright">· Premium</span>
        </h4>
        {locked ? (
          <PremiumLockedPreview compact pitch="See your chance of ramp by turn 2 and of drawing any card you pick by turn 4.">
            <SampleOdds />
          </PremiumLockedPreview>
        ) : (
          <div className="flex flex-col gap-2 text-xs text-foreground">
            {ramp > 0 && (
              <p>
                <span className="font-semibold">{pct(atLeastOne(size, ramp, seenByTurnOnPlay(2)))}</span> to have a Ramp card by turn 2
                <span className="text-muted"> ({ramp} in your Ramp category)</span>
              </p>
            )}
            {chosen && (
              <label className="flex flex-col gap-1">
                <span>
                  <span className="font-semibold">{pct(atLeastOne(size, pickCount, seenByTurnOnPlay(4)))}</span> to draw this by turn 4:
                </span>
                <select
                  value={chosen}
                  onChange={(e) => setPick(e.target.value)}
                  className="rounded border border-border bg-surface px-2 py-1 text-xs text-foreground"
                >
                  {picks.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        )}
      </div>
      <p className="mt-3 text-[11px] text-muted">Exact odds for a fresh shuffle, on the play, without mulligans.</p>
    </div>
  );
}

// Made-up rows for the locked preview; the real numbers only appear for Premium members.
function SampleOdds() {
  return (
    <div className="flex flex-col gap-2 py-1 text-xs text-foreground">
      <p className="text-[11px] uppercase tracking-wide text-muted">Example deck</p>
      <p>
        <span className="font-semibold">58%</span> to have a Ramp card by turn 2
      </p>
      <p>
        <span className="font-semibold">10%</span> to draw Sample Card by turn 4
      </p>
    </div>
  );
}
