"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { castPollVote } from "@/app/actions/community";
import type { PollOption } from "@/lib/community";

export default function PollVoteForm({ pollId, options }: { pollId: string; options: PollOption[] }) {
  const router = useRouter();
  const [choice, setChoice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!choice) return setError("Pick one first.");
    setBusy(true);
    setError(null);
    const r = await castPollVote(pollId, choice);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      {options.map((o) => (
        <label
          key={o.id}
          className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors ${choice === o.id ? "border-gold bg-gold/10 text-foreground" : "border-border bg-surface text-foreground hover:border-gold/60"}`}
        >
          <input type="radio" name="option" value={o.id} checked={choice === o.id} onChange={() => setChoice(o.id)} className="accent-[#e0b252]" />
          {o.label}
        </label>
      ))}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={busy} className="mt-2 self-start rounded-md bg-gold px-5 py-2.5 text-sm font-semibold text-black hover:bg-gold-bright disabled:opacity-50">
        {busy ? "Voting…" : "Vote"}
      </button>
      <p className="text-xs text-muted">One vote per account. Results show right after you vote.</p>
    </form>
  );
}
