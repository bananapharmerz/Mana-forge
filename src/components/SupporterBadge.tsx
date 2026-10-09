// Shown next to the author of a public deck when they're a Premium member.
export default function SupporterBadge({ tier }: { tier?: string | null }) {
  if (tier !== "premium") return null;
  return (
    <span
      title="Premium supporter"
      className="ml-1 inline-flex items-center rounded-full border border-gold/60 px-1.5 py-px align-middle text-[10px] font-semibold uppercase tracking-wide text-gold-bright"
    >
      ★ Supporter
    </span>
  );
}
