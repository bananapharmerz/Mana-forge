"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { SITE } from "@/lib/site";
import { LEGAL_LINKS } from "@/lib/legal";
import { SOCIALS } from "@/lib/socials";

export default function Footer() {
  const pathname = usePathname();
  // The play room is a fixed-height, no-scroll game board — the site footer would just push it
  // past the viewport and force a page scroll that defeats the point.
  if (pathname?.startsWith("/play/")) return null;

  return (
    <footer className="border-t border-border px-4 py-6 text-center text-[11px] text-muted sm:px-6">
      <nav aria-label="Social media" className="mb-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
        {SOCIALS.map((s) => (
          <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer" className="hover:text-gold-bright">
            {s.label}
          </a>
        ))}
      </nav>
      <p>
        Card images and data provided by{" "}
        <a
          href="https://scryfall.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-gold-bright"
        >
          Scryfall
        </a>
        . Individual card art is © its respective artist.
      </p>
      <p className="mt-1">
        Portions of {SITE.name} are unofficial Fan Content permitted under the Wizards of the
        Coast Fan Content Policy. Not approved/endorsed by Wizards. Portions of the materials
        used are property of Wizards of the Coast. ©Wizards of the Coast LLC.
      </p>
      <nav className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1">
        {LEGAL_LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="underline hover:text-gold-bright">
            {l.label}
          </Link>
        ))}
      </nav>
    </footer>
  );
}
