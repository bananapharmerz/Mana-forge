// Grey placeholder shapes in the page's layout while it loads, so nothing jumps when it arrives.
export default function GridSkeleton({ title, cards = 12, tall = true }: { title: string; cards?: number; tall?: boolean }) {
  return (
    <div role="status" aria-live="polite" aria-label={`Loading ${title}`}>
      <div className="border-b border-border/60 bg-surface/40">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <div className="h-9 w-56 animate-pulse rounded-md bg-surface-raised" />
          <div className="mt-3 h-4 w-full max-w-lg animate-pulse rounded bg-surface-raised/70" />
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="mb-6 h-10 w-full max-w-md animate-pulse rounded-md bg-surface-raised" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: cards }, (_, i) => (
            <div key={i} className={`${tall ? "aspect-[5/7]" : "h-24"} animate-pulse rounded-xl bg-surface-raised`} style={{ animationDelay: `${(i % 4) * 120}ms` }} />
          ))}
        </div>
      </div>
      <span className="sr-only">Loading {title}…</span>
    </div>
  );
}
