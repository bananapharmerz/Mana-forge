const TYPE_ORDER = ["creature", "land", "instant", "sorcery", "artifact", "enchantment", "planeswalker"];

const TYPE_LABELS: Record<string, string> = {
  creature: "Creatures",
  land: "Lands",
  instant: "Instants",
  sorcery: "Sorceries",
  artifact: "Artifacts",
  enchantment: "Enchantments",
  planeswalker: "Planeswalkers",
};

export default function TypeBreakdownBar({ counts }: { counts: Partial<Record<string, number>> }) {
  const present = TYPE_ORDER.filter((k) => (counts[k] ?? 0) > 0);

  if (present.length === 0) {
    return <p className="text-xs text-muted">No cards yet</p>;
  }

  return (
    <p className="line-clamp-2 text-xs text-muted">
      {present.map((k) => `${counts[k]} ${TYPE_LABELS[k]}`).join(", ")}
    </p>
  );
}
