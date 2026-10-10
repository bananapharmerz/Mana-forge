"use client";

import { useState } from "react";
import Link from "next/link";
import { saveDeckCopy } from "@/app/actions/decks";
import { trackGoal } from "@/components/SiteTracker";

export default function SaveDeckButton({ deckId, signedIn = true }: { deckId: string; signedIn?: boolean }) {
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setState("saving");
    setError(null);
    const result = await saveDeckCopy(deckId);
    if (!result.ok) {
      setState("error");
      setError(result.error);
      return;
    }
    trackGoal("deck");
    setState("saved");
  }

  // Signed out: sign up, then the deck page copies it in for them (?mine=1).
  if (!signedIn) {
    return (
      <Link
        href={`/signup?callbackUrl=${encodeURIComponent(`/decks/view/${deckId}?mine=1`)}`}
        className="block w-full rounded-md border border-border px-2 py-1 text-center text-xs text-muted hover:border-gold hover:text-foreground"
      >
        Save to My Decks
      </Link>
    );
  }

  return (
    <div>
      <button
        onClick={handleSave}
        disabled={state === "saving" || state === "saved"}
        className="w-full rounded-md border border-border px-2 py-1 text-xs text-muted hover:border-gold hover:text-foreground disabled:opacity-60"
      >
        {state === "saved" ? "Saved to My Decks ✓" : state === "saving" ? "Saving..." : "Save to My Decks"}
      </button>
      {error && <p className="mt-1 text-[10px] text-red-600">{error}</p>}
    </div>
  );
}
