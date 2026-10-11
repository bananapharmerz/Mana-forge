"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { readDecklist, type ImportedDeck } from "@/app/actions/importDeck";
import { importGuestDeck } from "@/app/actions/decks";
import { GUEST_DECK_ID, loadGuestDeck, saveGuestDeck } from "@/lib/guestDeck";
import { trackGoal } from "@/components/SiteTracker";

const EXAMPLE = `Commander
1 Krenko, Mob Boss

Deck
1 Sol Ring
1 Goblin Matron
30 Mountain`;

// Paste a list from Moxfield, Archidekt, Arena or MTGO (or an Archidekt link) and get a deck.
export default function ImportDeckPanel({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [choices, setChoices] = useState<string[] | null>(null);
  const [pick, setPick] = useState("");
  const [ready, setReady] = useState<{ deck: ImportedDeck; notFound: string[]; total: number } | null>(null);

  async function open(deck: ImportedDeck) {
    setBusy(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      const draft = { id: GUEST_DECK_ID, ...deck, cardBackUrl: null, isPublic: false, createdAt: now, updatedAt: now };
      if (!signedIn) {
        if (loadGuestDeck() && !window.confirm("Replace the deck you're building in this browser with this one?")) return;
        saveGuestDeck(draft);
        router.push(`/deck-builder/${GUEST_DECK_ID}`);
        return;
      }
      const r = await importGuestDeck(draft);
      if (!r.ok) return setError(r.error);
      trackGoal("deck");
      router.push(`/deck-builder/${r.id}`);
    } catch {
      setError("Couldn't save that deck. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function read(commander?: string) {
    setBusy(true);
    setError(null);
    setReady(null);
    try {
      const r = await readDecklist(input, commander);
      if (!r.ok) {
        setError(r.error);
        setChoices(r.pickCommander ?? null);
        if (r.pickCommander?.length) setPick(r.pickCommander[0]);
        return;
      }
      setChoices(null);
      if (r.notFound.length) return setReady(r);
      setBusy(false);
      await open(r.deck);
    } catch {
      setError("Something went wrong reading that list. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card-frame flex flex-col gap-3 p-5">
      <label htmlFor="deck-import" className="text-xs font-semibold uppercase tracking-wide text-muted">
        Your decklist or Archidekt link
      </label>
      <textarea
        id="deck-import"
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          setChoices(null);
          setReady(null);
        }}
        rows={12}
        placeholder={EXAMPLE}
        spellCheck={false}
        className="w-full rounded-md border border-border bg-surface px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted/70 focus:border-gold focus:outline-none"
      />

      {choices && choices.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-gold/40 bg-gold/10 p-3 text-sm">
          <span className="text-foreground">Which card is your commander?</span>
          <select
            value={pick}
            onChange={(e) => setPick(e.target.value)}
            className="rounded-md border border-border bg-surface px-2 py-1 text-sm text-foreground"
          >
            {choices.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <button
            onClick={() => read(pick)}
            disabled={busy}
            className="rounded-md bg-gold px-3 py-1.5 text-xs font-semibold text-black hover:bg-gold-bright disabled:opacity-50"
          >
            Use this commander
          </button>
        </div>
      )}
      {error && !choices && <p className="text-sm text-red-600">{error}</p>}

      {ready && (
        <div className="rounded-md border border-border p-3 text-sm">
          <p className="text-foreground">
            Found {ready.total} cards with <b>{ready.deck.commander.name}</b> as commander. We couldn&apos;t find{" "}
            {ready.notFound.length === 1 ? "this one" : `these ${ready.notFound.length}`}, so add{" "}
            {ready.notFound.length === 1 ? "it" : "them"} by hand afterwards:
          </p>
          <p className="mt-1 text-xs text-muted">{ready.notFound.join(" · ")}</p>
          <button
            onClick={() => open(ready.deck)}
            disabled={busy}
            className="mt-3 rounded-md bg-gold px-4 py-2 text-sm font-semibold text-black hover:bg-gold-bright disabled:opacity-50"
          >
            {busy ? "Opening..." : "Open the deck"}
          </button>
        </div>
      )}

      {!ready && (
        <button
          onClick={() => read()}
          disabled={busy || !input.trim()}
          data-track="import: import deck"
          className="w-fit rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-black hover:bg-gold-bright disabled:opacity-50"
        >
          {busy ? "Reading your list..." : "Import deck"}
        </button>
      )}
    </div>
  );
}
