"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveDeckCopy } from "@/app/actions/decks";

/** One click: copy a public deck into your account and open it in the builder. */
export default function MakeItMineButton({ deckId, signedIn }: { deckId: string; signedIn: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cls = "block w-full rounded-md bg-gold px-3 py-2 text-center text-xs font-semibold text-black hover:bg-gold-bright disabled:opacity-60";
  if (!signedIn) {
    return (
      <Link href={`/signup?callbackUrl=${encodeURIComponent(`/decks/view/${deckId}`)}`} className={cls}>
        Sign up &amp; make it mine
      </Link>
    );
  }
  return (
    <div>
      <button
        type="button"
        disabled={busy}
        className={cls}
        onClick={async () => {
          setBusy(true);
          setError(null);
          const r = await saveDeckCopy(deckId);
          if (r.ok) router.push(`/deck-builder/${r.id}`);
          else {
            setError(r.error);
            setBusy(false);
          }
        }}
      >
        {busy ? "Copying…" : "Make it mine"}
      </button>
      {error && <p className="mt-1 text-[10px] text-red-500">{error}</p>}
    </div>
  );
}
