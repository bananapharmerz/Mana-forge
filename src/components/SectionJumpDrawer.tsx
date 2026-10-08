"use client";

import { useState } from "react";

export default function SectionJumpDrawer({
  tabs,
}: {
  tabs: { id: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);

  if (tabs.length === 0) return null;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={() => setOpen(false)}
        />
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed left-0 top-1/2 z-50 -translate-y-1/2 rounded-r-lg border border-l-0 border-border bg-surface px-1.5 py-4 text-xs font-semibold text-gold-bright shadow-lg hover:bg-surface-raised"
        style={{ writingMode: "vertical-rl" }}
      >
        {open ? "Close" : "Sections"}
      </button>

      <div
        className={`fixed left-0 top-0 z-50 h-full w-60 overflow-y-auto border-r border-border bg-surface p-4 shadow-xl transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
          Jump to Section
        </h3>
        <div className="flex flex-col gap-1">
          {tabs.map((t) => (
            <a
              key={t.id}
              href={`#${t.id}`}
              onClick={() => setOpen(false)}
              className="rounded-md px-2.5 py-1.5 text-sm text-foreground hover:bg-surface-raised hover:text-gold-bright"
            >
              {t.label}
            </a>
          ))}
        </div>
      </div>
    </>
  );
}
