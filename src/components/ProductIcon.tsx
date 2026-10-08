const GRADIENTS: Record<string, string> = {
  sleeves: "from-purple-200/70 to-surface",
  deckbox: "from-amber-200/70 to-surface",
  playmat: "from-emerald-200/70 to-surface",
  dice: "from-red-200/70 to-surface",
  spindown: "from-blue-200/70 to-surface",
};

function IconGlyph({ icon }: { icon: string }) {
  const common = "h-16 w-16 text-gold-bright";
  switch (icon) {
    case "sleeve":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common}>
          <rect x="5" y="2" width="14" height="20" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <rect x="7.5" y="4.5" width="9" height="12" rx="1" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
        </svg>
      );
    case "deckbox":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common}>
          <rect x="3" y="7" width="18" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M3 7l2-4h14l2 4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M9 11h6" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case "playmat":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common}>
          <rect x="2" y="6" width="20" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M2 9h20" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        </svg>
      );
    case "dice":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common}>
          <path d="M12 2l9 5v10l-9 5-9-5V7l9-5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M12 2v10l9-5M12 12L3 7M12 12v10" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      );
    case "spindown":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common}>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
          <path d="M12 3v18M3 12h18" stroke="currentColor" strokeWidth="1" opacity="0.4" />
          <text x="12" y="15" textAnchor="middle" fontSize="7" fill="currentColor" stroke="none">20</text>
        </svg>
      );
    default:
      return <div className={common} />;
  }
}

export default function ProductIcon({ icon }: { icon: string }) {
  const gradient = GRADIENTS[icon] ?? "from-surface-raised to-surface";
  return (
    <div
      className={`flex aspect-square w-full items-center justify-center rounded-lg bg-gradient-to-br ${gradient}`}
    >
      <IconGlyph icon={icon} />
    </div>
  );
}
