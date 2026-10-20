import PremiumFlame from "@/components/PremiumFlame";

// Shown next to the author of a public deck when they're a Premium member. Ember, like every
// other Premium cue, so it doesn't blend in with the gold links around it.
export default function SupporterBadge({ tier }: { tier?: string | null }) {
  if (tier !== "premium") return null;
  return (
    <span
      title="Premium supporter"
      className="ml-1 inline-flex items-center gap-0.5 rounded-full border border-premium/60 px-1.5 py-px align-middle text-[10px] font-semibold uppercase tracking-wide text-premium"
    >
      <PremiumFlame className="h-2.5 w-2.5" />
      Supporter
    </span>
  );
}
