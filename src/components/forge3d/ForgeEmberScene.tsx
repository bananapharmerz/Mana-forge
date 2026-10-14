import Ember from "@/components/Ember";

// The homepage hero's centrepiece: Ember at work on the anvil, with forge sparks drifting up. Plain
// SVG and CSS (no three.js), so it shows straight away, costs almost nothing to load and is the same
// on every device. Animations stop for people who prefer reduced motion (see .forge-* in globals.css).

const SPARKS = Array.from({ length: 22 }, (_, i) => ({
  left: 30 + ((i * 37) % 40), // % across the anvil top
  delay: ((i * 0.53) % 3.2).toFixed(2),
  dur: (2.4 + ((i * 0.71) % 1.8)).toFixed(2),
  drift: ((i % 2 ? 1 : -1) * (12 + ((i * 13) % 50))).toFixed(0),
  size: 3 + (i % 3),
  // The sparks rise off the anvil in all five mana colors (W, U, B, R, G) with a little forge
  // gold — "every color, one forge" expressed in the one hero.
  hue: ["#f6efd0", "#49a3e0", "#9a73d6", "#ff5a3c", "#49b56a", "#ffc061"][i % 6],
}));

// Pass a positioning class (absolute …); it defaults to relative.
export default function ForgeEmberScene({ className = "relative" }: { className?: string }) {
  return (
    <div aria-hidden className={className}>
      {/* Forge heat behind everything */}
      <div className="forge-heat absolute inset-x-[5%] bottom-[8%] top-[20%] rounded-full bg-[radial-gradient(closest-side,rgba(255,138,61,0.45),rgba(193,65,12,0.18)_55%,transparent_75%)] blur-2xl" />

      {/* Sparks rising off the anvil */}
      <div className="absolute inset-x-0 bottom-[30%] top-0">
        {SPARKS.map((s, i) => (
          <span
            key={i}
            className="forge-spark absolute bottom-0 rounded-full"
            style={
              {
                left: `${s.left}%`,
                width: s.size,
                height: s.size,
                background: s.hue,
                boxShadow: `0 0 ${s.size * 3}px ${s.hue}`,
                animationDelay: `${s.delay}s`,
                animationDuration: `${s.dur}s`,
                "--drift": `${s.drift}px`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* Ember, standing on the anvil with the hammer */}
      <div className="forge-bob absolute inset-x-[14%] top-[19%]">
        <Ember mood="happy" size={400} className="h-auto w-full drop-shadow-[0_20px_40px_rgba(255,120,40,0.35)]" title="Ember, the Mana Forge mascot, at the anvil" />
      </div>

      {/* The anvil */}
      <svg viewBox="0 0 400 170" className="absolute inset-x-0 bottom-0 h-auto w-full">
        <defs>
          <linearGradient id="anvilTop" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#6b6f78" />
            <stop offset="0.25" stopColor="#3b3e45" />
            <stop offset="1" stopColor="#1d1e22" />
          </linearGradient>
          <linearGradient id="anvilBody" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2c2d33" />
            <stop offset="1" stopColor="#121216" />
          </linearGradient>
          <linearGradient id="anvilRim" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#ff8a3d" stopOpacity="0" />
            <stop offset="0.5" stopColor="#ffb347" stopOpacity="0.9" />
            <stop offset="1" stopColor="#ff8a3d" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* face and horn */}
        <path d="M40 18 C 70 18, 92 22, 110 30 L 330 30 L 352 18 L 352 58 L 120 58 C 92 58, 62 46, 40 18 Z" fill="url(#anvilTop)" />
        <rect x="110" y="26" width="242" height="5" rx="2" fill="url(#anvilRim)" />
        {/* waist and base */}
        <path d="M150 58 L 300 58 L 282 108 L 168 108 Z" fill="url(#anvilBody)" />
        <path d="M120 108 L 330 108 L 352 150 L 98 150 Z" fill="url(#anvilBody)" />
        <rect x="90" y="150" width="270" height="12" rx="4" fill="#0d0d10" />
        {/* the strike glow on the face */}
        <ellipse className="forge-strike" cx="230" cy="30" rx="46" ry="7" fill="#ffd27a" />
      </svg>
    </div>
  );
}
