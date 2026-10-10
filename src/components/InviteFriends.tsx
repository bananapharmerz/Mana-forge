"use client";

import { useState, useSyncExternalStore } from "react";

const noSubscribe = () => () => {};

/** Account page: your invite link, with copy and share buttons and how it's going. */
export default function InviteFriends({ link, joined, paid, percent, months, reward }: { link: string; joined: number; paid: number; percent: number; months: number; reward: string }) {
  const [note, setNote] = useState("");
  const canShare = useSyncExternalStore(noSubscribe, () => "share" in navigator, () => false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setNote("Link copied!");
    } catch {
      setNote("Couldn't copy. Select the link and copy it.");
    }
    setTimeout(() => setNote(""), 2500);
  };
  const share = async () => {
    try {
      await navigator.share({ title: "Mana Forge", text: `Build Commander decks free on Mana Forge. With my link you get ${percent}% off Premium for ${months} months:`, url: link });
    } catch {
      /* closed the share sheet */
    }
  };
  return (
    <section id="invite" className="card-frame mt-10 scroll-mt-28 p-5">
      <h2 className="font-display text-2xl font-semibold text-foreground">Invite friends</h2>
      <p className="mt-1 text-sm text-muted">
        Friends who sign up with your link get <b className="text-foreground">{percent}% off Premium for their first {months} months</b>. When one of them starts paying, you get <b className="text-foreground">{reward} credit</b>, a free month.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} aria-label="Your invite link" className="w-full rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground" />
        <button type="button" onClick={copy} className="shrink-0 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black hover:bg-gold-bright">
          Copy link
        </button>
        {canShare && (
          <button type="button" onClick={share} className="shrink-0 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:border-gold">
            Share
          </button>
        )}
      </div>
      <p className="mt-2 h-4 text-xs text-gold-bright" aria-live="polite">{note}</p>
      <p className="mt-1 text-xs text-muted">
        {joined === 0 ? "Nobody has joined with your link yet." : `${joined} friend${joined === 1 ? "" : "s"} joined · ${paid} started Premium`}
      </p>
    </section>
  );
}
