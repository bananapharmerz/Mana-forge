import { avatarFor } from "@/lib/avatars";

// A player's profile picture: a coloured gradient disc with a glyph. Pure CSS/emoji, no image
// host needed. Pass the player's name as `seed` so people without a chosen avatar still get a
// stable picture of their own rather than everyone sharing one.
export default function Avatar({
  avatar,
  seed,
  size = 28,
  className = "",
}: {
  avatar?: string | null;
  seed?: string | null;
  size?: number;
  className?: string;
}) {
  const a = avatarFor(avatar, seed);
  return (
    <span
      aria-hidden
      title={a.label}
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full leading-none ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.52),
        background: `linear-gradient(135deg, ${a.from}, ${a.to})`,
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.18)",
      }}
    >
      {a.glyph}
    </span>
  );
}
