import Link from "next/link";
import type { CommanderCategory } from "@/lib/categories";

const PREVIEW_COUNT = 5;

export default function CategoryFilterGroup({
  title,
  basePath,
  browseDimension,
  items,
  activeSlug,
  q,
}: {
  title: string;
  basePath: string;
  browseDimension?: string;
  items: CommanderCategory[];
  activeSlug?: string;
  q?: string;
}) {
  // If the active category was picked from "Search more" and isn't one of the first few, pin it
  // to the front so the row always shows what's currently selected instead of hiding it.
  const activeItem = activeSlug ? items.find((c) => c.slug === activeSlug) : undefined;
  const preview = activeItem
    ? [activeItem, ...items.filter((c) => c.slug !== activeSlug).slice(0, PREVIEW_COUNT - 1)]
    : items.slice(0, PREVIEW_COUNT);
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{title}</h3>
      <div className="flex flex-wrap items-center gap-1.5">
        {preview.map((c) => {
          const isActive = activeSlug === c.slug;
          // Clicking the already-active tab deselects it and drops back to the unfiltered page.
          const href = isActive
            ? `${basePath}${q ? `?${new URLSearchParams({ q })}` : ""}`
            : `${basePath}?${new URLSearchParams({ category: c.slug, ...(q ? { q } : {}) })}`;
          return (
            <Link
              key={c.slug}
              href={href}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                isActive
                  ? "border-gold bg-gold text-black"
                  : "border-border bg-surface text-muted hover:border-gold hover:text-foreground"
              }`}
            >
              {c.label}
            </Link>
          );
        })}
        {browseDimension && (
          <Link
            href={(() => {
              const params = new URLSearchParams();
              if (basePath !== "/commanders") params.set("base", basePath);
              if (activeItem) params.set("active", activeItem.slug);
              const qs = params.toString();
              return `/commanders/browse/${browseDimension}${qs ? `?${qs}` : ""}`;
            })()}
            className="rounded-full border border-dashed border-border px-3 py-1 text-xs font-medium text-gold-bright hover:border-gold"
          >
            Search more →
          </Link>
        )}
      </div>
    </div>
  );
}
