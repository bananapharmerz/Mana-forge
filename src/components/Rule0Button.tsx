"use client";

import { useState } from "react";

// "Rule 0" is the pregame chat about how strong everyone's deck is. This copies a short,
// plain-text summary of a public deck (bracket estimate, Game Changers, combos, value and the
// link) to paste into the playgroup chat. The summary is only built when the button is pressed,
// so the combo lookup never slows down a normal deck view.
export default function Rule0Button({ deckId }: { deckId: string }) {
  const [state, setState] = useState<"idle" | "busy" | "copied" | "error">("idle");
  const [text, setText] = useState<string | null>(null);

  async function copy() {
    setState("busy");
    try {
      const res = await fetch(`/api/deck-card/${encodeURIComponent(deckId)}?view=rule0`);
      if (!res.ok) throw new Error(String(res.status));
      const summary = await res.text();
      try {
        await navigator.clipboard.writeText(summary);
        setText(null);
        setState("copied");
        setTimeout(() => setState("idle"), 2500);
      } catch {
        // No clipboard access (some in-app browsers): show the text so it can be copied by hand.
        setText(summary);
        setState("idle");
      }
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 3000);
    }
  }

  return (
    <div className="mt-2">
      <button
        onClick={copy}
        disabled={state === "busy"}
        className="w-full rounded-md border border-border px-3 py-2 text-xs text-muted hover:border-gold hover:text-foreground disabled:opacity-60"
      >
        {state === "busy" ? "Checking the deck…" : state === "copied" ? "Copied! Paste it in your group chat" : "Copy Rule 0 summary for group chat"}
      </button>
      {state === "error" && <p className="mt-1 text-[11px] text-down">Couldn&apos;t build the summary. Try again in a moment.</p>}
      {text && (
        <textarea
          readOnly
          value={text}
          rows={8}
          onFocus={(e) => e.currentTarget.select()}
          className="mt-2 w-full rounded-md border border-border bg-surface p-2 text-[11px] text-foreground"
        />
      )}
    </div>
  );
}
