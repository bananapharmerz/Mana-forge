// Preset profile pictures. We don't host uploaded images (no object store on this deploy), so a
// "profile picture" is a choice from this fixed set: a coloured gradient disc with a glyph. The
// chosen key is stored on User.avatar; null means "pick one from the player's name" so everyone
// has a picture even before they choose. Keep keys stable — they're persisted in the database.

export interface AvatarDef {
  key: string;
  label: string;
  from: string; // gradient start
  to: string; // gradient end
  glyph: string; // emoji, so it looks right without a foreground colour
}

export const AVATARS: AvatarDef[] = [
  { key: "plains", label: "Plains", from: "#f4e9c3", to: "#cdb979", glyph: "🏔️" },
  { key: "island", label: "Island", from: "#8fd0f4", to: "#2563a8", glyph: "🌊" },
  { key: "swamp", label: "Swamp", from: "#6b6475", to: "#2a2630", glyph: "💀" },
  { key: "mountain", label: "Mountain", from: "#f0a579", to: "#c23b22", glyph: "🔥" },
  { key: "forest", label: "Forest", from: "#8fce8f", to: "#2f7d46", glyph: "🌳" },
  { key: "artifact", label: "Artifact", from: "#cfd6de", to: "#7d8794", glyph: "💎" },
  { key: "dragon", label: "Dragon", from: "#e2763b", to: "#7a1f10", glyph: "🐉" },
  { key: "planeswalker", label: "Planeswalker", from: "#b98cd9", to: "#5b2a8a", glyph: "🧙" },
  { key: "sword", label: "Sword", from: "#d9c48b", to: "#8a6d2f", glyph: "⚔️" },
  { key: "shield", label: "Shield", from: "#8fb6d9", to: "#2f5d8a", glyph: "🛡️" },
  { key: "crown", label: "Crown", from: "#f3d98b", to: "#b8862f", glyph: "👑" },
  { key: "spark", label: "Spark", from: "#9fd6e2", to: "#2f8aa0", glyph: "✨" },
];

const BY_KEY = new Map(AVATARS.map((a) => [a.key, a]));

/** Small, stable hash of a string → non-negative int, for picking a default avatar from a name. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** The avatar to show: the chosen preset, or a stable default derived from the name (or a seed). */
export function avatarFor(key: string | null | undefined, seed?: string | null): AvatarDef {
  if (key && BY_KEY.has(key)) return BY_KEY.get(key)!;
  const s = (seed || "").trim() || "player";
  return AVATARS[hash(s) % AVATARS.length];
}

export const isAvatarKey = (v: unknown): v is string => typeof v === "string" && BY_KEY.has(v);
