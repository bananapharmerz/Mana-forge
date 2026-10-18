"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveDeckCopy } from "@/app/actions/decks";
import { trackGoal } from "@/components/SiteTracker";

/**
 * One click: copy a public deck into your account and open it in the builder.
 * `quiet` renders it as a text link, for places like the home page where several copies sit
 * side by side and the gold button belongs to the one main call to action.
 */
export default function MakeItMineButton({
  deckId,
  signedIn,
  large = false,
  quiet = false,
}: {
  deckId: string;
  signedIn: boolean;
  large?: boolean;
  quiet?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cls = quiet
    ? "block w-full py-1 text-center text-xs font-semibold text-gold-bright underline-offset-2 hover:underline disabled:opacity-60"
    : `block w-full rounded-md bg-gold text-center font-semibold text-black hover:bg-gold-bright disabled:opacity-60 ${large ? "px-5 py-2.5 text-sm" : "px-3 py-2 text-xs"}`;
  const started = useRef(false);

  async function copy() {
    setBusy(true);
    setError(null);
    const r = await saveDeckCopy(deckId);
    if (r.ok) {
      trackGoal("deck");
      router.push(`/deck-builder/${r.id}`);
    }
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

  // Copying saves the deck to an account, so say so up front with "Copy with free account"
  // rather than a bare "Make it mine".
  if (!signedIn) {
    return (
      <Link href={`/signup?callbackUrl=${encodeURIComponent(`/decks/view/${deckId}?mine=1`)}`} className={cls}>
        Copy with free account
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
      {error && <p className="mt-1 text-[10px] text-down">{error}</p>}
    </div>
  );
}
