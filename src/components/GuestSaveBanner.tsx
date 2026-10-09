"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { importGuestDeck } from "@/app/actions/decks";
import { clearGuestDeck, loadGuestDeck } from "@/lib/guestDeck";

// Shown in place of "Make Public" while building without an account, and on the deck list
// once the visitor has logged in, so their draft can move into their account in one click.
export default function GuestSaveBanner({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const { status } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const deck = loadGuestDeck();
    if (!deck) return;
    setBusy(true);
    setError(null);
    const r = await importGuestDeck(deck);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    clearGuestDeck();
    router.push(`/deck-builder/${r.id}`);
  }

  if (status === "authenticated") {
    return (
      <div className={`card-frame ${compact ? "" : "mt-3"} flex flex-col gap-2 p-3 text-xs text-muted`}>
        <p>This draft is only saved in this browser.</p>
        <button
          onClick={save}
          disabled={busy}
          className="rounded-md bg-gold px-3 py-2 font-semibold text-black hover:bg-gold-bright disabled:opacity-50"
        >
          {busy ? "Saving..." : "Save to my account"}
        </button>
        {error && <p className="text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className={`card-frame ${compact ? "" : "mt-3"} flex flex-col gap-2 p-3 text-xs text-muted`}>
      <p>
        You&apos;re building as a guest. The deck is kept in this browser only. Create a free account to save it,
        share it and play with it.
      </p>
      <Link
        href="/signup?callbackUrl=/deck-builder"
        className="rounded-md bg-gold px-3 py-2 text-center font-semibold text-black hover:bg-gold-bright"
      >
        Sign up free to save
      </Link>
      <Link href="/login?callbackUrl=/deck-builder" className="text-center underline hover:text-gold-bright">
        I already have an account
      </Link>
    </div>
  );
}
