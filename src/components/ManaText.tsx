// Magic's mana and tap symbols ({2}{U}{U}, {T}, {U/P}…) drawn with Scryfall's official symbol
// images instead of raw braces. ManaCost is for a cost on its own; ManaText for rules text with
// symbols inside it.

const SYMBOL = /\{([^}]{1,8})\}/g;

function symbolUrl(code: string): string {
  return `https://svgs.scryfall.io/card-symbols/${encodeURIComponent(code.replace(/\//g, "").toUpperCase())}.svg`;
}

function Symbol({ code, size }: { code: string; size: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={symbolUrl(code)}
      alt={`{${code}}`}
      title={`{${code}}`}
      width={16}
      height={16}
      loading="lazy"
      className={`inline-block ${size} align-[-0.15em] drop-shadow-[0_1px_0_rgba(0,0,0,0.25)]`}
    />
  );
}

export function ManaCost({ cost, className = "" }: { cost?: string | null; className?: string }) {
  if (!cost) return null;
  // Split cards and modal double-faced cards: "{1}{U} // {2}{R}"
  const halves = cost.split(" // ");
  return (
    <span className={`inline-flex items-center gap-[2px] ${className}`} aria-label={`Mana cost ${cost}`}>
      {halves.map((h, i) => (
        <span key={i} className="inline-flex items-center gap-[2px]">
          {i > 0 && <span className="mx-1 text-muted">{"//"}</span>}
          {[...h.matchAll(SYMBOL)].map((m, j) => (
            <Symbol key={j} code={m[1]} size="h-[1.2em] w-[1.2em]" />
          ))}
        </span>
      ))}
    </span>
  );
}

export function ManaText({ text }: { text: string }) {
  const parts: (string | { code: string })[] = [];
  let last = 0;
  for (const m of text.matchAll(SYMBOL)) {
    if (m.index! > last) parts.push(text.slice(last, m.index));
    parts.push({ code: m[1] });
    last = m.index! + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return (
    <>
      {parts.map((p, i) => (typeof p === "string" ? <span key={i}>{p}</span> : <Symbol key={i} code={p.code} size="mx-[1px] h-[0.95em] w-[0.95em]" />))}
    </>
  );
}
