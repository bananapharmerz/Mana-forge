"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { voteChallengeFinalist } from "@/app/actions/community";

export default function ChallengeVoteButton({ challengeId, entryId }: { challengeId: string; entryId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <button
        onClick={async () => {
          setBusy(true);
          setError(null);
          const r = await voteChallengeFinalist(challengeId, entryId);
          setBusy(false);
          if (!r.ok) return setError(r.error);
          router.refresh();
        }}
        disabled={busy}
        className="w-full rounded-md bg-gold px-3 py-2 text-sm font-semibold text-black hover:bg-gold-bright disabled:opacity-50"
      >
        {busy ? "Voting…" : "Vote for this deck"}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
