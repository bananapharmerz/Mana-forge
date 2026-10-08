"use client";

import { useState } from "react";
import { saveEdhrecDeckCopy } from "@/app/actions/decks";
import type { EdhrecPublicDeck } from "@/lib/edhrec";

export default function SaveEdhrecDeckButton({
  deck,
  commanderName,
}: {
  deck: EdhrecPublicDeck;
  commanderName: string;
}) {
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (state === "saving" || state === "saved") return;

    setState("saving");
    setError(null);
    const result = await saveEdhrecDeckCopy(deck, commanderName);
    if (!result.ok) {
      setState("error");
      setError(result.error);
      return;
    }
    setState("saved");
  }

  return (
    <div className="flex-1">
      <button
        onClick={handleSave}
        disabled={state === "saving" || state === "saved"}
        className="w-full rounded-md border border-border px-2 py-1 text-xs text-muted hover:border-gold hover:text-foreground disabled:opacity-60"
      >
        {state === "saved" ? "Saved to My Decks ✓" : state === "saving" ? "Building deck..." : "Save to My Decks"}
      </button>
      {error && <p className="mt-1 text-[10px] text-red-600">{error}</p>}
    </div>
  );
}
