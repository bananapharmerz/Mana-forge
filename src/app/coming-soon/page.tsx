import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Coming soon",
  robots: { index: false },
};

export default function ComingSoonPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Coming soon</p>
      <h1 className="mt-3 text-3xl font-bold text-foreground">The store isn&apos;t open yet</h1>
      <p className="mt-3 text-muted">
        Sleeves, deck boxes, playmats and printed proxies are on the way. Until then, build a deck,
        browse what others made, or start a game with friends.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/deck-builder" className="rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-black hover:bg-gold-bright">
          Build a deck
        </Link>
        <Link href="/decks" className="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-foreground hover:border-gold">
          Public decks
        </Link>
        <Link href="/play" className="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-foreground hover:border-gold">
          Play
        </Link>
      </div>
    </div>
  );
}
