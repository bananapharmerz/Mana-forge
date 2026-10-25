import { findCombos } from "@/lib/commanderSpellbook";

// "Combos in this deck" on a public deck: every combo the list already has all the pieces for,
// from Commander Spellbook. Free for everyone, since knowing your deck's combos helps you pick an
// honest bracket. Renders nothing if there are none or Spellbook doesn't answer in time.
export default async function DeckCombos({ commanders, cards }: { commanders: string[]; cards: string[] }) {
  if (commanders.length === 0 || cards.length === 0) return null;
  const combos = await findCombos(commanders, cards);
  if (combos.length === 0) return null;

  return (
    <details className="card-frame mt-4 p-4">
      <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-muted">
        Combos in this deck ({combos.length})
      </summary>
      <ul className="mt-3 flex flex-col gap-3">
        {combos.map((c) => (
          <li key={c.url + c.pieces.join("|")} className="text-xs">
            <p className="font-medium text-foreground">{c.pieces.join(" + ")}</p>
            <p className="mt-0.5 text-muted">{c.produces.join(", ")}</p>
            <a href={c.url} target="_blank" rel="noopener noreferrer" className="mt-0.5 inline-block text-gold underline hover:text-gold-bright">
              How it works
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] text-muted">
        Combo data from{" "}
        <a href="https://commanderspellbook.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
          Commander Spellbook
        </a>
        .
      </p>
    </details>
  );
}
