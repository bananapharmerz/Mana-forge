// Mana-symbol emblems for the five-colour sleeves. Generic element glyphs (sun / drop / skull /
// flame / leaf) drawn in a 24x24 box — recognisable as WUBRG without copying the official symbols.
type ManaSymbol = "white" | "blue" | "black" | "red" | "green";

function ManaEmblem({ symbol, color }: { symbol: ManaSymbol; color: string }) {
  const common = { fill: color } as const;
  switch (symbol) {
    case "white": // sun
      return (
        <svg viewBox="0 0 24 24" className="h-full w-full">
          <circle cx="12" cy="12" r="4.4" {...common} />
          {Array.from({ length: 8 }).map((_, i) => {
            const a = (i * Math.PI) / 4;
            const x1 = 12 + Math.cos(a) * 7;
            const y1 = 12 + Math.sin(a) * 7;
            const x2 = 12 + Math.cos(a) * 9.6;
            const y2 = 12 + Math.sin(a) * 9.6;
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="1.8" strokeLinecap="round" />;
          })}
        </svg>
      );
    case "blue": // water drop
      return (
        <svg viewBox="0 0 24 24" className="h-full w-full">
          <path d="M12 2.5 C 8.5 8, 6 11, 6 14.5 a6 6 0 0 0 12 0 C 18 11, 15.5 8, 12 2.5 Z" {...common} />
        </svg>
      );
    case "black": // skull
      return (
        <svg viewBox="0 0 24 24" className="h-full w-full">
          <path d="M12 3 C 7 3, 4 6.5, 4 11 c0 2.6 1.3 4.3 3 5.3 V 19 h2 v-1.5 h1.2 V 19 h1.6 v-1.5 H13 V 19 h2 v-2.7 c1.7-1 3-2.7 3-5.3 C 20 6.5, 17 3, 12 3 Z" {...common} />
          <circle cx="9" cy="11" r="1.7" fill="#0b0810" />
          <circle cx="15" cy="11" r="1.7" fill="#0b0810" />
        </svg>
      );
    case "red": // flame
      return (
        <svg viewBox="0 0 24 24" className="h-full w-full">
          <path d="M13 2 C 13 6, 17 7.5, 16 12 c2-1 2.5-3 2.5-3 C 20 13, 19 20, 12 21 C 6 21, 4 16, 6 12 c1 2 2.5 2.5 2.5 2.5 C 7 10, 10 7, 13 2 Z" {...common} />
        </svg>
      );
    case "green": // leaf
      return (
        <svg viewBox="0 0 24 24" className="h-full w-full">
          <path d="M19 4 C 9 4, 4 10, 4 18 c0 1 .3 2 .3 2 S 7 14, 12 11 c-3 4-5 9-5 9 C 18 22, 20 12, 19 4 Z" {...common} />
        </svg>
      );
  }
}

export const CARD_BACK_STYLES = [
  { id: "classic", label: "Classic Blue", gradient: "linear-gradient(135deg, #1a2a52, #0d1530)", ring: "#c9a227" },
  { id: "crimson", label: "Crimson", gradient: "linear-gradient(135deg, #5c1a1a, #2b0a0a)", ring: "#c9a227" },
  { id: "emerald", label: "Emerald", gradient: "linear-gradient(135deg, #123c2a, #071b13)", ring: "#c9a227" },
  { id: "amethyst", label: "Amethyst", gradient: "linear-gradient(135deg, #3a1a52, #190a2b)", ring: "#c9a227" },
  { id: "obsidian", label: "Obsidian", gradient: "linear-gradient(135deg, #2a2a2a, #0a0a0a)", ring: "#8a8a8a" },
  { id: "sunburst", label: "Sunburst", gradient: "linear-gradient(135deg, #7a4a12, #2b1704)", ring: "#f0c04a" },
  // The five mana colours, each with its element emblem.
  { id: "mana-white", label: "White", gradient: "linear-gradient(135deg, #cfc7a0, #6f6a52)", ring: "#f6efd0", symbol: "white" as const, emblem: "#fff8e0" },
  { id: "mana-blue", label: "Blue", gradient: "linear-gradient(135deg, #0e4f8f, #072a4e)", ring: "#49a3e0", symbol: "blue" as const, emblem: "#cdeaff" },
  { id: "mana-black", label: "Black", gradient: "linear-gradient(135deg, #2a2432, #0b0810)", ring: "#b9a7d6", symbol: "black" as const, emblem: "#d6cde6" },
  { id: "mana-red", label: "Red", gradient: "linear-gradient(135deg, #7a1f14, #2b0a06)", ring: "#ff5a3c", symbol: "red" as const, emblem: "#ffd2b0" },
  { id: "mana-green", label: "Green", gradient: "linear-gradient(135deg, #14512a, #07200f)", ring: "#49b56a", symbol: "green" as const, emblem: "#c6ecd0" },
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
  const manaSymbol = "symbol" in style ? style.symbol : undefined;
  const emblemColor = "emblem" in style ? style.emblem : style.ring;
  return (
    <div
      className={`relative overflow-hidden rounded-md border-2 ${className ?? ""}`}
      style={{ aspectRatio: "2.5 / 3.5", background: style.gradient, borderColor: style.ring }}
    >
      <div
        className="absolute inset-[10%] rounded-full border-2 opacity-60"
        style={{ borderColor: style.ring }}
      />
      {manaSymbol ? (
        <div className="absolute inset-[30%] drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]">
          <ManaEmblem symbol={manaSymbol} color={emblemColor} />
        </div>
      ) : (
        <div
          className="absolute inset-[36%] rounded-full opacity-90"
          style={{ background: style.ring }}
        />
      )}
    </div>
  );
}
