import Ember from "@/components/Ember";

// The homepage hero's centrepiece: Ember at work on the anvil. Plain SVG and CSS (no three.js), so it
// shows straight away, costs almost nothing to load and is the same on every device. The flying
// sparks are a separate <canvas> (ForgeSparks) layered over the hero; everything stops for people who
// prefer reduced motion (see .forge-* in globals.css).
//
// The scene box is locked to aspect-[4/5] (see ForgeHero), Ember fills inset-x-[14%] top-[19%] at a
// 400x400 viewBox, and the anvil's strike point maps to Ember's own coords at about (242,368). The
// hammer + her forearm are drawn in a sibling SVG that shares Ember's exact box and viewBox: the
// flame grip sits on her hand (322,202) and the head reaches the anvil face. The forearm pivots at
// her shoulder (286,252) so the whole arm pumps, and the hammer pivots at the hand for the wrist snap.

// The on-impact star burst: a 4-point sparkle in each of the five mana colours (W, U, B, R, G),
// flying out from the anvil face on the strike beat (see .forge-star in globals.css).
const STAR_D = "M0 -7 C 1.2 -2, 2 -1.2, 7 0 C 2 1.2, 1.2 2, 0 7 C -1.2 2, -2 1.2, -7 0 C -2 -1.2, -1.2 -2, 0 -7 Z";
const BURST = [
  { dx: -38, dy: -34, c: "#f6efd0" }, // W
  { dx: -22, dy: -48, c: "#49a3e0" }, // U
  { dx: -6, dy: -52, c: "#9a73d6" }, // B
  { dx: 14, dy: -50, c: "#ff5a3c" }, // R
  { dx: 32, dy: -38, c: "#49b56a" }, // G
  { dx: 46, dy: -22, c: "#f6efd0" },
  { dx: -50, dy: -18, c: "#49a3e0" },
  { dx: 26, dy: -54, c: "#ff5a3c" },
  { dx: -30, dy: -44, c: "#49b56a" },
  { dx: 10, dy: -58, c: "#9a73d6" },
];

// Pass a positioning class (absolute …); it defaults to relative.
export default function ForgeEmberScene({ className = "relative" }: { className?: string }) {
  return (
    <div aria-hidden className={className}>
      {/* Forge heat behind everything */}
      <div className="forge-heat absolute inset-x-[5%] bottom-[8%] top-[20%] rounded-full bg-[radial-gradient(closest-side,rgba(255,138,61,0.45),rgba(193,65,12,0.18)_55%,transparent_75%)] blur-2xl" />

      {/* Ember, standing at the anvil. forging = no built-in hammer/right arm; the overlay below
          supplies the swinging hammer and the moving arm so they don't double up. */}
      <div className="forge-bob absolute inset-x-[14%] top-[19%]">
        <Ember mood="happy" forging size={400} className="h-auto w-full drop-shadow-[0_20px_40px_rgba(255,120,40,0.35)]" title="Ember, the Mana Forge mascot, at the anvil" />
      </div>

      {/* The anvil (wobbles on each strike; overflow-visible so the sparks can fly up off it) */}
      <svg viewBox="0 0 400 170" className="forge-anvil overflow-visible absolute inset-x-0 bottom-0 h-auto w-full">
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
        {/* puff of smoke on impact */}
        <g transform="translate(230 24)">
          <ellipse className="forge-smoke" cx="0" cy="0" rx="11" ry="7" fill="#cac7bd" />
        </g>
        {/* five-colour star sparks bursting off the strike */}
        {BURST.map((s, i) => (
          <g key={i} transform="translate(230 30)">
            <path className="forge-star" d={STAR_D} fill={s.c} style={{ "--dx": `${s.dx}px`, "--dy": `${s.dy}px` } as React.CSSProperties} />
          </g>
        ))}
      </svg>

      {/* Marker at the strike point (57%, 72% of the scene box) — ForgeSparks reads this to know
          where to throw the sparks from, so they always come off the anvil face. */}
      <span data-forge-strike className="absolute h-px w-px" style={{ left: "57%", top: "72%" }} />

      {/* Ember's forearm + the hammer she swings. Same box + viewBox as Ember, so the grip lands on
          her hand. .forge-arm pumps the whole arm about her shoulder; .forge-hammer snaps the wrist.
          Placed after the anvil so the head reads on top of the face when it lands. */}
      <div className="forge-bob absolute inset-x-[14%] top-[19%]">
        <svg viewBox="0 0 400 400" className="h-auto w-full overflow-visible">
          <g className="forge-arm">
            {/* flame forearm hanging from her shoulder down to the hand at waist height */}
            <path d="M286 252 Q 298 282 316 306" fill="none" stroke="#ff8a3d" strokeWidth="15" strokeLinecap="round" />
            <path d="M292 258 Q 302 284 314 302" fill="none" stroke="#ffb15a" strokeWidth="5" strokeLinecap="round" opacity="0.5" />
            <g className="forge-hammer">
              <g transform="rotate(50 316 306)">
                {/* handle, running down from the hand at the waist */}
                <rect x="309" y="304" width="14" height="84" rx="7" fill="#7a4f27" />
                <rect x="313" y="306" width="3.5" height="80" rx="1.75" fill="#9c6c3a" />
                {/* steel head at the striking end (centred ~316,402 locally); squashes on impact */}
                <g className="forge-headhit">
                  <rect x="290" y="389" width="52" height="26" rx="6" fill="#565c67" />
                  <rect x="290" y="389" width="52" height="8" rx="4" fill="#79808d" />
                  <rect x="290" y="409" width="52" height="6" rx="3" fill="#383c44" />
                </g>
                {/* flame fist gripping the handle at the waist */}
                <circle cx="314" cy="296" r="14" fill="#ff8a3d" />
                <circle cx="316" cy="306" r="18" fill="#ff8a3d" />
                <circle cx="311" cy="302" r="7" fill="#ffc061" opacity="0.6" />
              </g>
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}
