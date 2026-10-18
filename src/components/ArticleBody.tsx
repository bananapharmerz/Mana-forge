import Link from "next/link";
import type { ReactNode } from "react";

// Renders the small Markdown subset used by /articles (see src/lib/articles.ts): blank-line
// separated blocks, "## "/"### " headings, "- " and "1. " lists, inline **bold** and [text](url).
// Everything goes through React (no dangerouslySetInnerHTML), so article text can't inject markup.

function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let i = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      out.push(<strong key={`${keyBase}-b${i}`}>{m[1]}</strong>);
    } else {
      const label = m[2] ?? "";
      const url = m[3] ?? "#";
      out.push(
        url.startsWith("/") ? (
          <Link key={`${keyBase}-l${i}`} href={url} className="text-gold-bright underline hover:text-gold">
            {label}
          </Link>
        ) : (
          <a key={`${keyBase}-l${i}`} href={url} target="_blank" rel="noopener noreferrer" className="text-gold-bright underline hover:text-gold">
            {label}
          </a>
        )
      );
    }
    last = m.index + m[0].length;
    i++;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export default function ArticleBody({ body }: { body: string }) {
  const blocks = body.trim().split(/\n\n+/);
  return (
    <div className="flex flex-col gap-4 text-[15px] leading-relaxed text-foreground/90">
      {blocks.map((block, bi) => {
        if (block.startsWith("## ")) {
          return (
            <h2 key={bi} className="mt-4 font-display text-2xl font-semibold text-foreground">
              {inline(block.slice(3), `h${bi}`)}
            </h2>
          );
        }
        if (block.startsWith("### ")) {
          return (
            <h3 key={bi} className="mt-2 font-display text-lg font-semibold text-foreground">
              {inline(block.slice(4), `h${bi}`)}
            </h3>
          );
        }
        const lines = block.split("\n");
        if (lines.length > 0 && lines.every((l) => /^\d+\.\s/.test(l))) {
          return (
            <ol key={bi} className="ml-5 flex list-decimal flex-col gap-1.5">
              {lines.map((l, li) => (
                <li key={li}>{inline(l.replace(/^\d+\.\s/, ""), `o${bi}-${li}`)}</li>
              ))}
            </ol>
          );
        }
        if (lines.length > 0 && lines.every((l) => /^-\s/.test(l))) {
          return (
            <ul key={bi} className="ml-5 flex list-disc flex-col gap-1.5">
              {lines.map((l, li) => (
                <li key={li}>{inline(l.replace(/^-\s/, ""), `u${bi}-${li}`)}</li>
              ))}
            </ul>
          );
        }
        return <p key={bi}>{inline(block.replace(/\n/g, " "), `p${bi}`)}</p>;
      })}
    </div>
  );
}
