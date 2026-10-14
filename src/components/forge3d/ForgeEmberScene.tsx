import Ember from "@/components/Ember";

// The homepage hero's centrepiece: Ember at work on the anvil, with forge sparks flying up. Plain
// SVG and CSS (no three.js), so it shows straight away, costs almost nothing to load and is the same
// on every device. Animations stop for people who prefer reduced motion (see .forge-* in globals.css).
//
// The scene box is locked to aspect-[4/5] (see ForgeHero), Ember fills inset-x-[14%] top-[19%] at a
// 400x400 viewBox, and the anvil's strike point maps to Ember's own coords at about (242,368). So the
// hammer is drawn in a sibling SVG that shares Ember's exact box and viewBox: its flame grip sits on
// Ember's hand (322,202) and the head reaches down-left to the anvil face — the grip stays glued to
// her hand on any screen, and the swing pivots there (.forge-hammer in globals.css).

const SPARKS = Array.from({ length: 22 }, (_, i) => ({
  left: 53 + ((i * 7) % 11), // cluster on the strike point (~57% across)
  delay: ((i * 0.017) % 0.12).toFixed(3), // a hair of stagger so the burst isn't robotic
  drift: (i % 2 ? 1 : -1) * (6 + ((i * 11) % 22)), // only a slight lean — mostly straight up
  rise: 220 + ((i * 37) % 160), // fly up and off the top of the hero
  w: 2 + (i % 2), // thin
  h: 11 + (i % 3) * 5, // tall streak (so they read as lines, not dots)
  // The sparks fly off the strike in all five mana colors (W, U, B, R, G) with a little forge
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
      <div className="absolute inset-x-0 bottom-[28%] top-0">
        {SPARKS.map((s, i) => (
          <span
            key={i}
            className="forge-spark absolute bottom-0 rounded-full"
            style={
              {
                left: `${s.left}%`,
                width: s.w,
                height: s.h,
                background: s.hue,
                boxShadow: `0 0 ${s.w * 4}px ${s.hue}`,
                animationDelay: `${s.delay}s`,
                "--drift": `${s.drift}px`,
                "--rise": `${s.rise}px`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* Ember, standing at the anvil (her happy pose already grips a little hammer; the swinging
          hammer below is drawn over that same hand). */}
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

      {/* The hammer Ember swings. Same box + viewBox as Ember, so the grip lands exactly on her hand.
          Drawn in its landed pose (grip 322,202 → head on the anvil); the swing rotates it about the
          grip. Placed after the anvil so the head reads on top of the face when it lands. */}
      <div className="forge-bob absolute inset-x-[14%] top-[19%]">
        <svg viewBox="0 0 400 400" className="h-auto w-full overflow-visible">
          <g className="forge-hammer">
            <g transform="rotate(25.7 322 202)">
              {/* handle, running down from the hand */}
              <rect x="314.5" y="200" width="15" height="152" rx="7" fill="#7a4f27" />
              <rect x="319" y="202" width="4" height="146" rx="2" fill="#9c6c3a" />
              {/* steel head at the striking end (centred ~322,386 locally) */}
              <rect x="288" y="369" width="68" height="34" rx="7" fill="#565c67" />
              <rect x="288" y="369" width="68" height="10" rx="4" fill="#79808d" />
              <rect x="288" y="395" width="68" height="8" rx="3" fill="#383c44" />
              {/* flame fist gripping the handle — also covers Ember's little built-in hammer */}
              <circle cx="320" cy="184" r="24" fill="#ff8a3d" />
              <circle cx="322" cy="202" r="21" fill="#ff8a3d" />
              <circle cx="315" cy="195" r="9" fill="#ffc061" opacity="0.65" />
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}
