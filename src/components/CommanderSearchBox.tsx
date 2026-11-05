"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Category = { slug: string; label: string };
type Item = { label: string; href: string; kind: "Filter" | "Commander" };

const MAX = 5;
// At most two filter suggestions, so commander names always get most of the list.
const MAX_FILTERS = 2;

// The search box on /commanders. It still sits inside the page's plain GET form, so Enter (and the
// page without JavaScript) searches exactly as before. While typing it suggests up to 5 things:
// matching filters (tribes, themes, colours) from the categories the page already knows, then
// commander names from our own /api/search-suggest, the same source the header search uses.
// Nothing typed here is stored; the route only keeps its short-lived rate-limit counter.
export default function CommanderSearchBox({ defaultValue = "", categories }: { defaultValue?: string; categories: Category[] }) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);
  const [commanders, setCommanders] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  const q = value.trim();
  const lower = q.toLowerCase();
  const filters: Item[] =
    q.length >= 2
      ? categories
          .filter((c) => c.label.toLowerCase().includes(lower))
          .sort((a, b) => Number(!a.label.toLowerCase().startsWith(lower)) - Number(!b.label.toLowerCase().startsWith(lower)))
          .slice(0, MAX_FILTERS)
          .map((c) => ({ label: c.label, href: `/commanders?${new URLSearchParams({ category: c.slug })}`, kind: "Filter" as const }))
      : [];
  const items: Item[] =
    q.length >= 2
      ? [...filters, ...commanders.map((name) => ({ label: name, href: `/decks/${encodeURIComponent(name)}`, kind: "Commander" as const }))].slice(0, MAX)
      : [];

  // Same timing as the header search: 250ms after the last key, nothing until 2 letters.
  useEffect(() => {
    if (q.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search-suggest?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        if (!res.ok) return;
        const data = (await res.json()) as { commanders?: string[] };
        setCommanders(data.commanders ?? []);
        setActive(-1);
      } catch {
        /* typing again aborts the old request; a failed lookup just shows no commander names */
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  // Close the list when the click lands anywhere outside the search box.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const listId = "commander-search-list";
  const showList = open && items.length > 0;

  return (
    <div ref={boxRef} className="relative w-full max-w-md">
      <label htmlFor="commander-search" className="sr-only">
        Search commanders
      </label>
      <input
        id="commander-search"
        type="text"
        name="q"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
        }}
        onFocus={() => items.length > 0 && setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && items.length > 0) {
            e.preventDefault();
            setOpen(true);
            setActive((a) => (a + 1) % items.length);
          } else if (e.key === "ArrowUp" && items.length > 0) {
            e.preventDefault();
            setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
          } else if (e.key === "Enter" && showList && active >= 0) {
            // Only a suggestion picked with the arrow keys overrides Enter; otherwise the form
            // submits the normal search as before.
            e.preventDefault();
            setOpen(false);
            router.push(items[active].href);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder="Search commanders by name or text..."
        autoComplete="off"
        enterKeyHint="search"
        maxLength={80}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-gold focus:outline-none"
      />
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 z-50 mt-1 max-h-80 overflow-y-auto rounded-md border border-border bg-surface-raised py-1 shadow-xl"
        >
          {items.map((it, i) => (
            <li key={it.href} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
              <Link
                href={it.href}
                onClick={() => setOpen(false)}
                onMouseEnter={() => setActive(i)}
                className={`flex items-center justify-between gap-3 px-3 py-2 text-sm ${
                  i === active ? "bg-gold text-black" : "text-foreground"
                }`}
              >
                <span className="truncate">{it.label}</span>
                <span className={`shrink-0 text-[11px] uppercase tracking-wide ${i === active ? "text-black/70" : "text-muted"}`}>
                  {it.kind}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
