import Link from "next/link";
import type { ReactNode } from "react";
import { LEGAL_LINKS, legalInfo } from "@/lib/legal";

/** Shared frame for the legal pages: title, last-updated line, readable text, links to the others. */
export default function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  const { updated } = legalInfo();
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-foreground">{title}</h1>
      <p className="mt-2 text-xs text-muted">Last updated {updated}</p>
      <div className="mt-8 space-y-4 text-sm leading-relaxed text-foreground/90 [&_a]:text-gold [&_a]:underline [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1">
        {children}
      </div>
      <nav className="mt-12 flex flex-wrap gap-4 border-t border-border pt-6 text-xs text-muted">
        {LEGAL_LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="hover:text-gold-bright">
            {l.label}
          </Link>
        ))}
      </nav>
    </article>
  );
}
