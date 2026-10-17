"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CardSearchBox from "@/components/CardSearchBox";
import { autocompleteCommanderNames } from "@/lib/scryfall";
import { buildDeckFromCollection } from "@/app/actions/decks";

// Pick a commander and start a Commander deck seeded with the cards you already own that fit its
// colour identity, then finish it in the deck builder.
export default function BuildFromCollection() {
  const router = useRouter();
  const [commander, setCommander] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function build() {
    if (!commander) { setError("Pick a commander first."); return; }
    setBusy(true);
    setError(null);
    try {
      const res = await buildDeckFromCollection(commander);
      if (!res.ok) { setError(res.error); setBusy(false); return; }
      router.push(`/deck-builder/${res.id}`);
    } catch {
      setError("Couldn't build that deck — try again.");
      setBusy(false);
    }
  }

  return (
    <div className="card-frame mx-auto mt-10 max-w-xl p-5">
      <h2 className="font-display text-lg font-bold text-foreground">Build a deck from your collection</h2>
      <p className="mt-1 text-sm text-muted">
        Pick a commander and we&apos;ll start a deck with the cards you already own that fit its colors — you finish it in the deck builder.
      </p>
      <div className="mt-3">
        <CardSearchBox
          placeholder="Search for a commander..."
          fetchSuggestions={autocompleteCommanderNames}
          onSelect={(name) => { setCommander(name); setError(null); }}
          clearOnSelect={false}
        />
        {commander && <p className="mt-2 text-sm text-gold-bright">Building around: {commander}</p>}
      </div>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      <button
        type="button"
        onClick={build}
        disabled={busy || !commander}
        className="mt-3 rounded-lg bg-gold px-5 py-2.5 text-sm font-bold text-black hover:bg-gold-bright disabled:opacity-50"
      >
        {busy ? "Building…" : "Build deck →"}
      </button>
    </div>
  );
}
