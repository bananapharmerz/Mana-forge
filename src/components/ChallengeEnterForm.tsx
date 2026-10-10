"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { enterChallenge, withdrawChallengeEntry } from "@/app/actions/community";

export interface EnterableDeck {
  id: string;
  name: string;
  commanderName: string;
  isPublic: boolean;
}

export default function ChallengeEnterForm({
  challengeId,
  decks,
  current,
}: {
  challengeId: string;
  decks: EnterableDeck[];
  current: { deckId: string; note: string } | null;
}) {
  const router = useRouter();
  const [deckId, setDeckId] = useState(current?.deckId ?? decks.find((d) => d.isPublic)?.id ?? "");
  const [note, setNote] = useState(current?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const picked = decks.find((d) => d.id === deckId);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const r = await enterChallenge(challengeId, deckId, note);
    setBusy(false);
    if (!r.ok) return setMsg({ ok: false, text: r.error });
    setMsg({ ok: true, text: current ? "Entry updated." : "You're in. Good luck!" });
    router.refresh();
  }

  async function withdraw() {
    setBusy(true);
    const r = await withdrawChallengeEntry(challengeId);
    setBusy(false);
    if (!r.ok) return setMsg({ ok: false, text: r.error });
    setMsg({ ok: true, text: "Entry withdrawn." });
    router.refresh();
  }

  if (!decks.length) {
    return (
      <p className="text-sm text-muted">
        You don&apos;t have a deck yet. <Link href="/deck-builder" className="text-gold-bright underline">Build one</Link>, make it public, then come back to enter.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label className="text-sm text-foreground">
        Your deck
        <select value={deckId} onChange={(e) => setDeckId(e.target.value)} className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-base text-foreground focus:border-gold focus:outline-none sm:text-sm">
          {decks.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} ({d.commanderName}){d.isPublic ? "" : " · private"}
            </option>
          ))}
        </select>
      </label>
      {picked && !picked.isPublic && (
        <p className="text-xs text-amber-600">
          This deck is private. <Link href={`/deck-builder/${picked.id}`} className="underline">Open it</Link> and click &quot;Make Public&quot; so voters can see it.
        </p>
      )}
      <label className="text-sm text-foreground">
        How does it fit the theme?
        <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={600} rows={3} placeholder="A sentence or two: the deck's plan and your take on the theme." className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-base text-foreground placeholder:text-muted focus:border-gold focus:outline-none sm:text-sm" />
      </label>
      {msg && <p className={`text-sm ${msg.ok ? "text-emerald-600" : "text-red-600"}`}>{msg.text}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy || !deckId} className="rounded-md bg-gold px-5 py-2.5 text-sm font-semibold text-black hover:bg-gold-bright disabled:opacity-50">
          {busy ? "Saving…" : current ? "Update my entry" : "Enter this deck"}
        </button>
        {current && (
          <button type="button" onClick={withdraw} disabled={busy} className="rounded-md border border-border px-4 py-2.5 text-sm text-muted hover:border-gold hover:text-foreground disabled:opacity-50">
            Withdraw
          </button>
        )}
      </div>
      <p className="text-xs text-muted">One entry per member. You can swap decks or edit your note until entries close.</p>
    </form>
  );
}
