const TYPE_LABELS: [key: string, label: string][] = [
  ["creature", "Creature"],
  ["instant", "Instant"],
  ["sorcery", "Sorcery"],
  ["artifact", "Artifact"],
  ["enchantment", "Enchantment"],
  ["planeswalker", "Planeswalker"],
  ["battle", "Battle"],
  ["land", "Land"],
];

export default function CardTypeChart({ counts }: { counts: Record<string, number> }) {
  const rows = TYPE_LABELS.filter(([key]) => (counts[key] ?? 0) > 0);
  const total = rows.reduce((s, [key]) => s + (counts[key] ?? 0), 0) || 1;
  const max = Math.max(1, ...rows.map(([key]) => counts[key] ?? 0));

  return (
    <div className="flex flex-col gap-2">
      {rows.map(([key, label]) => (
        <div key={key} className="flex items-center gap-2">
          <span className="w-28 shrink-0 text-xs text-muted">{label}</span>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-surface-raised">
            <div
              className="h-full rounded-full bg-gold"
              style={{ width: `${((counts[key] ?? 0) / max) * 100}%` }}
            />
          </div>
          <span className="w-10 shrink-0 text-right text-xs text-foreground">
            {(((counts[key] ?? 0) / total) * 100).toFixed(0)}%
          </span>
        </div>
      ))}
    </div>
  );
}
