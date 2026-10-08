const COLOR_ORDER = ["W", "U", "B", "R", "G"] as const;

export default function ManaPips({ colors }: { colors: string[] }) {
  if (!colors || colors.length === 0) {
    return <span className="mana-pip mana-c">C</span>;
  }

  const sorted = [...colors].sort(
    (a, b) => COLOR_ORDER.indexOf(a as never) - COLOR_ORDER.indexOf(b as never)
  );

  return (
    <span className="inline-flex gap-1">
      {sorted.map((c) => (
        <span key={c} className={`mana-pip mana-${c.toLowerCase()}`}>
          {c}
        </span>
      ))}
    </span>
  );
}
