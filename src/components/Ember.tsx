// Ember, Mana Forge's mascot: a little forge-fire spirit. Pure SVG, so it's sharp at any size.
// mood: "happy" (default), "hyped" (wins, good news), "thinking" (loading), "oops" (errors, empty).
export type EmberMood = "happy" | "hyped" | "thinking" | "oops";

const ARMS_DOWN = (
  <>
    <path d="M116 250 C 92 248, 80 230, 84 214" fill="none" stroke="#ff8a3d" strokeWidth="14" strokeLinecap="round" />
    <path d="M284 250 C 306 246, 318 228, 326 206" fill="none" stroke="#ff8a3d" strokeWidth="14" strokeLinecap="round" />
  </>
);
const SPARKS = (
  <>
    <path d="M76 120 l8 -14 l8 14 l-8 14 z" fill="#f4ecd2" />
    <path d="M310 92 l7 -12 l7 12 l-7 12 z" fill="#3d8fd6" />
    <path d="M60 300 l7 -12 l7 12 l-7 12 z" fill="#8f7bd0" />
    <path d="M330 300 l8 -14 l8 14 l-8 14 z" fill="#e0533a" />
    <path d="M120 70 l6 -10 l6 10 l-6 10 z" fill="#3c9a5a" />
  </>
);
function Eyes({ dx = 0, dy = 0 }: { dx?: number; dy?: number }) {
  return (
    <>
      <ellipse cx="172" cy="246" rx="17" ry="21" fill="#fff" />
      <ellipse cx="228" cy="246" rx="17" ry="21" fill="#fff" />
      <circle cx={175 + dx} cy={250 + dy} r="10" fill="#2a1608" />
      <circle cx={231 + dx} cy={250 + dy} r="10" fill="#2a1608" />
      <circle cx={179 + dx} cy={245 + dy} r="3.5" fill="#fff" />
      <circle cx={235 + dx} cy={245 + dy} r="3.5" fill="#fff" />
    </>
  );
}

const FACES: Record<EmberMood, React.ReactNode> = {
  happy: (
    <>
      <Eyes />
      <path d="M184 284 Q 200 300 216 284" fill="none" stroke="#2a1608" strokeWidth="5" strokeLinecap="round" />
      {ARMS_DOWN}
      <rect x="318" y="166" width="10" height="56" rx="4" fill="#8a5a2e" transform="rotate(18 323 194)" />
      <rect x="300" y="152" width="46" height="24" rx="5" fill="#5d6470" transform="rotate(18 323 164)" />
      {SPARKS}
    </>
  ),
  hyped: (
    <>
      <path d="M156 250 Q 172 230 188 250" fill="none" stroke="#2a1608" strokeWidth="7" strokeLinecap="round" />
      <path d="M212 250 Q 228 230 244 250" fill="none" stroke="#2a1608" strokeWidth="7" strokeLinecap="round" />
      <path d="M180 278 Q 200 314 220 278 Z" fill="#7a2410" />
      <path d="M116 240 C 96 220, 92 190, 100 168" fill="none" stroke="#ff8a3d" strokeWidth="14" strokeLinecap="round" />
      <path d="M284 240 C 304 220, 308 190, 300 168" fill="none" stroke="#ff8a3d" strokeWidth="14" strokeLinecap="round" />
      {SPARKS}
    </>
  ),
  thinking: (
    <>
      <Eyes dx={-4} dy={-6} />
      <path d="M154 218 L 186 212" stroke="#2a1608" strokeWidth="5" strokeLinecap="round" />
      <path d="M188 290 L 212 286" stroke="#2a1608" strokeWidth="5" strokeLinecap="round" />
      <path d="M116 250 C 92 248, 80 230, 84 214" fill="none" stroke="#ff8a3d" strokeWidth="14" strokeLinecap="round" />
      <path d="M284 260 C 270 290, 240 300, 226 298" fill="none" stroke="#ff8a3d" strokeWidth="14" strokeLinecap="round" />
      <circle cx="314" cy="120" r="8" fill="#f5ecd6" opacity="0.7" />
      <circle cx="336" cy="92" r="12" fill="#f5ecd6" opacity="0.7" />
      <circle cx="352" cy="58" r="16" fill="#f5ecd6" opacity="0.7" />
    </>
  ),
  oops: (
    <>
      <ellipse cx="172" cy="250" rx="15" ry="17" fill="#fff" />
      <ellipse cx="228" cy="250" rx="15" ry="17" fill="#fff" />
      <circle cx="172" cy="256" r="8" fill="#2a1608" />
      <circle cx="228" cy="256" r="8" fill="#2a1608" />
      <path d="M152 226 L 186 236" stroke="#2a1608" strokeWidth="5" strokeLinecap="round" />
      <path d="M248 226 L 214 236" stroke="#2a1608" strokeWidth="5" strokeLinecap="round" />
      <path d="M186 298 Q 200 286 214 298" fill="none" stroke="#2a1608" strokeWidth="5" strokeLinecap="round" />
      {ARMS_DOWN}
      <path d="M262 196 C 268 208, 272 214, 266 222 C 260 228, 252 222, 254 214 C 256 206, 262 196, 262 196 Z" fill="#9fd4ff" />
    </>
  ),
};

export default function Ember({ mood = "happy", size = 160, className, title }: { mood?: EmberMood; size?: number; className?: string; title?: string }) {
  // Every Ember uses the same gradients, so repeated ids on one page are harmless.
  const id = "ember";
  return (
    <svg width={size} height={size} viewBox="0 0 400 400" className={className} role="img" aria-label={title ?? `Ember, the Mana Forge mascot (${mood})`}>
      <defs>
        <linearGradient id={`eb${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd27a" />
          <stop offset="0.55" stopColor="#ff8a3d" />
          <stop offset="1" stopColor="#d9481f" />
        </linearGradient>
        <linearGradient id={`ec${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff3d6" />
          <stop offset="1" stopColor="#ffc061" />
        </linearGradient>
      </defs>
      <ellipse cx="200" cy="362" rx="96" ry="14" fill="#000" opacity="0.35" />
      <path d="M200 52 C 214 96, 268 128, 290 196 C 312 264, 270 350, 200 350 C 130 350, 88 264, 110 196 C 124 152, 162 140, 168 104 C 182 122, 192 92, 200 52 Z" fill={`url(#eb${id})`} />
      <path d="M200 150 C 214 182, 252 206, 252 254 C 252 300, 228 326, 200 326 C 172 326, 148 300, 148 254 C 148 214, 186 196, 200 150 Z" fill={`url(#ec${id})`} opacity="0.9" />
      <ellipse cx="152" cy="280" rx="11" ry="6" fill="#ff6f6f" opacity="0.55" />
      <ellipse cx="248" cy="280" rx="11" ry="6" fill="#ff6f6f" opacity="0.55" />
      {FACES[mood]}
    </svg>
  );
}
