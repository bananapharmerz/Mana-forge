"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Suggestions = { commanders: string[]; cards: { name: string; id: string }[] };
type Item = { label: string; href: string; kind: "Commander" | "Card" };

// The header search: a plain GET form to the commander browser (so Enter, and the page without
// JavaScript, still land on /commanders?q=), plus suggestions as you type. Same timing as
// CardSearchBox (250ms after the last key, nothing until 2 letters), but the suggestions come from
// our own /api/search-suggest so visitors' browsers never call Scryfall from here.
export default function NavSearch({
  id,
  autoFocus = false,
  className = "",
  onNavigate,
}: {
  id: string;
  autoFocus?: boolean;
  className?: string;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [data, setData] = useState<Suggestions | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  const q = value.trim();
  const items: Item[] =
    q.length >= 2 && data
      ? [
          ...data.commanders.map((name) => ({ label: name, href: `/decks/${encodeURIComponent(name)}`, kind: "Commander" as const })),
          ...data.cards.map((c) => ({ label: c.name, href: `/prices/card/${c.id}`, kind: "Card" as const })),
        ]
      : [];

  useEffect(() => {
    if (q.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search-suggest?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        if (!res.ok) return;
        setData((await res.json()) as Suggestions);
        setActive(-1);
        setOpen(true);
      } catch {
        /* typing again aborts the old request; a failed lookup just shows no suggestions */
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

  const done = () => {
    setOpen(false);
    setValue("");
    setData(null);
    onNavigate?.();
  };

  const listId = `${id}-list`;
  const showList = open && items.length > 0;

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <form action="/commanders" method="GET" role="search" onSubmit={() => onNavigate?.()} className="flex gap-2">
        <label htmlFor={id} className="sr-only">
          Search commanders or cards
        </label>
        <input
          id={id}
          type="search"
          name="q"
          value={value}
          onChange={(e) => setValue(e.target.value)}
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
              // submits to the commander browser as before.
              e.preventDefault();
              router.push(items[active].href);
              done();
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder="Search commanders or cards"
          autoComplete="off"
          enterKeyHint="search"
          autoFocus={autoFocus}
          maxLength={80}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-base text-foreground placeholder:text-muted focus:border-gold focus:outline-none sm:text-sm xl:py-1.5"
        />
      </form>
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 z-50 mt-1 max-h-80 min-w-[16rem] overflow-y-auto rounded-md border border-border bg-surface-raised py-1 shadow-xl"
        >
          {items.map((it, i) => (
            <li key={it.href} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
              <Link
                href={it.href}
                onClick={done}
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
