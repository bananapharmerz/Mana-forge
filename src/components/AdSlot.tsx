export default function AdSlot({
  tier,
  variant = "banner",
}: {
  tier: string | null | undefined;
  variant?: "banner" | "square";
}) {
  if (tier === "premium") return null;

  return (
    <div
      className={`card-frame flex items-center justify-center border-dashed p-4 text-center text-xs text-muted ${
        variant === "banner" ? "min-h-16" : "aspect-square"
      }`}
    >
      Advertisement — Premium removes ads across the whole site.
    </div>
  );
}
