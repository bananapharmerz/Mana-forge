import Link from "next/link";
import Ember from "@/components/Ember";

export const metadata = { title: "Page not found", robots: { index: false } };

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <Ember mood="oops" size={150} className="mx-auto" title="Ember, the Mana Forge mascot, looking puzzled" />
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">404</p>
      <h1 className="mt-3 text-3xl font-bold text-foreground">This card isn&apos;t in the deck.</h1>
      <p className="mt-3 text-sm text-muted">The page you were looking for doesn&apos;t exist, or it was made private.</p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/" className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black hover:bg-gold-bright">
          Go home
        </Link>
        <Link href="/commanders" className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:border-gold">
          Browse commanders
        </Link>
      </div>
    </div>
  );
}
