"use client";

import { useState } from "react";

// Share a public deck: the system share sheet on phones, otherwise copy the link. The deck's
// picture (/api/deck-card/<id>) shows up as the link preview on Discord, X, etc., and can be saved.
export default function ShareDeckButton({ deckId, name }: { deckId: string; name: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  const url = () => `${window.location.origin}/decks/view/${deckId}`;

  async function share() {
    const link = url();
    try {
      if (navigator.share) {
        await navigator.share({ title: name, text: `${name}: my Commander deck`, url: link });
        return;
      }
    } catch {
      // cancelled or not allowed: fall back to copying
    }
    try {
      await navigator.clipboard.writeText(link);
      setMsg("Link copied");
    } catch {
      setMsg(link);
    }
    setTimeout(() => setMsg(null), 2500);
  }

  return (
    <div className="mt-4">
      <div className="flex gap-2">
        <button onClick={share} className="flex-1 rounded-md bg-gold px-3 py-2 text-xs font-semibold text-black hover:bg-gold-bright">
          Share deck
        </button>
        <a
          href={`/api/deck-card/${deckId}`}
          download={`${name.replace(/[^\w\- ]+/g, "").trim() || "deck"}.png`}
          className="rounded-md border border-border px-3 py-2 text-xs text-muted hover:border-gold hover:text-foreground"
        >
          Save image
        </a>
      </div>
      {msg && <p className="mt-1 break-all text-[11px] text-emerald-600">{msg}</p>}
    </div>
  );
}
