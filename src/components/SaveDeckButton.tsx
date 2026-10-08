"use client";

import { useState } from "react";
import { saveDeckCopy } from "@/app/actions/decks";

export default function SaveDeckButton({ deckId }: { deckId: string }) {
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
    setState("saved");
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
