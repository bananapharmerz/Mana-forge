"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveDeckCopy } from "@/app/actions/decks";

/** One click: copy a public deck into your account and open it in the builder. */
export default function MakeItMineButton({ deckId, signedIn, large = false }: { deckId: string; signedIn: boolean; large?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cls = `block w-full rounded-md bg-gold text-center font-semibold text-black hover:bg-gold-bright disabled:opacity-60 ${large ? "px-5 py-2.5 text-sm" : "px-3 py-2 text-xs"}`;
  const started = useRef(false);

  async function copy() {
    setBusy(true);
    setError(null);
    const r = await saveDeckCopy(deckId);
    if (r.ok) router.push(`/deck-builder/${r.id}`);
    else {
      setError(r.error);
      setBusy(false);
    }
  }

  // Coming back from sign-up with ?mine=1: finish what they clicked, without a second click.
  useEffect(() => {
    if (!signedIn || started.current) return;
    if (new URLSearchParams(window.location.search).get("mine") !== "1") return;
    started.current = true;
    // Runs once, when the page opens from the sign-up redirect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void copy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn]);

  if (!signedIn) {
    return (
      <Link href={`/signup?callbackUrl=${encodeURIComponent(`/decks/view/${deckId}?mine=1`)}`} className={cls}>
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
        onClick={() => void copy()}
      >
        {busy ? "Copying…" : "Make it mine"}
      </button>
      {error && <p className="mt-1 text-[10px] text-red-500">{error}</p>}
    </div>
  );
}
