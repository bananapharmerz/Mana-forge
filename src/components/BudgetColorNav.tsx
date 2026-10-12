import Link from "next/link";
import { BUDGET_COLORS } from "@/lib/budget";

// The row of colour links above the budget-commander lists: "All" plus every colour page.
// `current` is the slug being shown, or undefined on the all-colours page.
export default function BudgetColorNav({ current }: { current?: string }) {
  const base = "rounded-full border px-3 py-1 text-xs font-semibold transition-colors";
  const on = "border-gold bg-gold text-black";
  const off = "border-border text-muted hover:border-gold hover:text-gold-bright";
  return (
    <nav aria-label="Budget commanders by color" className="mb-8 flex flex-wrap gap-2">
      <Link href="/commanders/budget" className={`${base} ${current ? off : on}`}>
        All colors
      </Link>
      {BUDGET_COLORS.map((c) => (
        <Link key={c.slug} href={`/commanders/budget/${c.slug}`} className={`${base} ${current === c.slug ? on : off}`}>
          {c.name.split(" (")[0]}
        </Link>
      ))}
    </nav>
  );
}
