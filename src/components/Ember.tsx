// Ember, Mana Forge's mascot: a little forge-fire spirit. Rendered from the painted art in
// public/ember/*. (The old hand-built SVG and seasonal witch hat have been retired.)
export type EmberMood = "happy" | "hyped" | "thinking" | "oops";
// Kept for backwards-compatibility with older call sites; no longer affects rendering.
export type EmberCostume = "none" | "witch";

const MOOD_FILE: Record<EmberMood, string> = {
  happy: "ember_happy", // cheerful bust
  hyped: "ember_celebrate", // arms up, celebrating (wins / good news)
  thinking: "ember_thinking", // curious (loading)
  oops: "ember_shocked", // surprised (errors / empty / not-found)
};

export default function Ember({
  mood = "happy",
  size = 160,
  className,
  title,
}: {
  mood?: EmberMood;
  size?: number;
  className?: string;
  title?: string;
  // Accepted but ignored (legacy props):
  costume?: EmberCostume;
  forging?: boolean;
}) {
  const file = MOOD_FILE[mood] ?? "ember_happy";
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/ember/${file}.png`}
      width={size}
      height={size}
      alt={title ?? `Ember, the Mana Forge mascot (${mood})`}
      className={className}
      style={{ objectFit: "contain" }}
      draggable={false}
    />
  );
}
