"use client";

import { useState } from "react";
import Link from "next/link";
import { addWatch } from "@/app/actions/prices";

export default function WatchButton({ scryfallId, name, signedIn, watching }: { scryfallId: string; name: string; signedIn: boolean; watching: boolean }) {
  const [state, setState] = useState<"idle" | "busy" | "done">(watching ? "done" : "idle");
  const [msg, setMsg] = useState<string | null>(null);
  if (!signedIn) {
    return (
      <Link href={`/signup?callbackUrl=${encodeURIComponent(`/prices/card/${scryfallId}`)}`} className="inline-block rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black hover:bg-gold-bright">
        Watch this card (free account)
      </Link>
    );
  }
  if (state === "done") {
    return (
      <Link href="/prices" className="inline-block rounded-lg border border-border px-4 py-2 text-sm text-muted hover:border-gold hover:text-foreground">
        On your watchlist · set a target price →
      </Link>
    );
  }
  return (
    <div>
      <button
        type="button"
        disabled={state === "busy"}
        onClick={async () => {
          setState("busy");
          const r = await addWatch(name, scryfallId);
          if (r.ok) setState("done");
          else {
            setMsg(r.error);
            setState("idle");
          }
        }}
        className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black hover:bg-gold-bright disabled:opacity-50"
      >
        {state === "busy" ? "Adding…" : "Watch this card"}
      </button>
      {msg && <p className="mt-1 text-xs text-red-600">{msg}</p>}
    </div>
  );
}
