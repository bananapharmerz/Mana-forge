// A small grey "B3" next to a deck's card count: power level is the first thing a player checks
// before copying a list. Grey and neutral on purpose: it's our estimate, not Wizards' rating, so
// it shouldn't look like a seal of approval. Renders nothing when there's no estimate.
export default function BracketBadge({ badge }: { badge: string | null | undefined }) {
  if (!badge) return null;
  const label = `Estimated Bracket ${badge} (unofficial)`;
  return (
    <span
      title={label}
      aria-label={label}
      className="ml-1 inline-flex items-center rounded border border-border px-1 py-px align-middle text-[10px] font-semibold text-muted"
    >
      B{badge}
    </span>
  );
}
