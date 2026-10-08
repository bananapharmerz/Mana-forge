"use client";

import { useState } from "react";
import Link from "next/link";

export interface BrowseItem {
  key: string;
  label: string;
  sublabel?: string;
  href: string;
  active?: boolean;
}

export default function BrowseSearchList({
  items,
  placeholder,
}: {
  items: BrowseItem[];
  placeholder: string;
}) {
  const [q, setQ] = useState("");
  const filtered = q.trim()
    ? items.filter((i) => i.label.toLowerCase().includes(q.trim().toLowerCase()))
    : items;

  return (
    <div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        className="w-full max-w-md rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-gold focus:outline-none"
        autoFocus
      />

      <p className="mt-2 text-xs text-muted">{filtered.length} results</p>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {filtered.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={`card-frame flex flex-col p-3 transition-colors hover:border-gold ${
              item.active ? "border-gold bg-gold text-black" : ""
            }`}
          >
            <span className={`text-sm font-medium ${item.active ? "text-black" : "text-foreground"}`}>
              {item.label}
            </span>
            {item.sublabel && (
              <span className={`text-xs ${item.active ? "text-black/70" : "text-muted"}`}>{item.sublabel}</span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
