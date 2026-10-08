export const CARD_BACK_STYLES = [
  { id: "classic", label: "Classic Blue", gradient: "linear-gradient(135deg, #1a2a52, #0d1530)", ring: "#c9a227" },
  { id: "crimson", label: "Crimson", gradient: "linear-gradient(135deg, #5c1a1a, #2b0a0a)", ring: "#c9a227" },
  { id: "emerald", label: "Emerald", gradient: "linear-gradient(135deg, #123c2a, #071b13)", ring: "#c9a227" },
  { id: "amethyst", label: "Amethyst", gradient: "linear-gradient(135deg, #3a1a52, #190a2b)", ring: "#c9a227" },
  { id: "obsidian", label: "Obsidian", gradient: "linear-gradient(135deg, #2a2a2a, #0a0a0a)", ring: "#8a8a8a" },
  { id: "sunburst", label: "Sunburst", gradient: "linear-gradient(135deg, #7a4a12, #2b1704)", ring: "#f0c04a" },
] as const;

export type BuiltinCardBack = (typeof CARD_BACK_STYLES)[number];

export function resolveCardBack(
  value?: string | null
): BuiltinCardBack | { id: "custom"; label: "Custom"; imageUrl: string } {
  if (value && (value.startsWith("data:") || value.startsWith("http"))) {
    return { id: "custom", label: "Custom", imageUrl: value };
  }
  return CARD_BACK_STYLES.find((s) => s.id === value) ?? CARD_BACK_STYLES[0];
}

export default function CardBack({
  value,
  className,
}: {
  value?: string | null;
  className?: string;
}) {
  const style = resolveCardBack(value);
  if ("imageUrl" in style) {
    return (
      <div
        className={`overflow-hidden rounded-md border-2 border-gold ${className ?? ""}`}
        style={{ aspectRatio: "2.5 / 3.5" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={style.imageUrl}
          alt="Card back"
          className="h-full w-full object-cover"
          draggable={false}
        />
      </div>
    );
  }
  return (
    <div
      className={`relative overflow-hidden rounded-md border-2 ${className ?? ""}`}
      style={{ aspectRatio: "2.5 / 3.5", background: style.gradient, borderColor: style.ring }}
    >
      <div
        className="absolute inset-[10%] rounded-full border-2 opacity-60"
        style={{ borderColor: style.ring }}
      />
      <div
        className="absolute inset-[36%] rounded-full opacity-90"
        style={{ background: style.ring }}
      />
    </div>
  );
}
