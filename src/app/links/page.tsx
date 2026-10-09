import type { Metadata } from "next";
import Link from "next/link";
import Ember from "@/components/Ember";
import { SITE } from "@/lib/site";
import { SOCIALS } from "@/lib/socials";

// The one link for every social media bio: the site plus all our other pages.
export const metadata: Metadata = {
  title: "Links",
  description: `${SITE.name} on the web and on social media.`,
  alternates: { canonical: "/links" },
};

const main = [
  { href: "/deck-builder", label: "Build a Commander deck, free" },
  { href: "/commanders", label: "Browse commanders" },
  { href: "/prices", label: "Card prices" },
  { href: "/play", label: "Play online with friends" },
];

export default function LinksPage() {
  return (
    <main className="mx-auto flex max-w-md flex-col items-center gap-6 px-4 py-12">
      <Ember mood="happy" size={140} />
      <div className="text-center">
        <h1 className="font-display text-3xl text-gold-bright">{SITE.name}</h1>
        <p className="mt-1 text-sm text-muted">Free Commander deck builder, prices and play.</p>
      </div>
      <Link href="/" className="w-full rounded-xl bg-gold px-5 py-3 text-center font-semibold text-black hover:bg-gold-bright">
        {SITE.url.replace(/^https?:\/\//, "")}
      </Link>
      <nav className="flex w-full flex-col gap-2">
        {main.map((l) => (
          <Link key={l.href} href={l.href} className="rounded-xl border border-border px-5 py-3 text-center hover:border-gold">
            {l.label}
          </Link>
        ))}
      </nav>
      <div className="w-full border-t border-border pt-5">
        <p className="mb-3 text-center text-xs uppercase tracking-widest text-muted">Follow us</p>
        <div className="flex flex-col gap-2">
          {SOCIALS.map((s) => (
            <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer" className="flex justify-between rounded-xl border border-border px-5 py-3 hover:border-gold">
              <span>{s.label}</span>
              <span className="text-muted">{s.handle}</span>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
