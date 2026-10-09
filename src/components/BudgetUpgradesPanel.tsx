"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getBudgetUpgrades, type Upgrade } from "@/app/actions/upgrades";

const CAPS = [1, 3, 5, 10];

// Premium perk in the deck builder: popular picks for this commander, under a price you choose.
export default function BudgetUpgradesPanel({
  deckId,
  guest,
  onAdd,
}: {
  deckId: string;
  guest?: boolean;
  onAdd: (name: string) => void | Promise<void>;
}) {
  const [cap, setCap] = useState(3);
  const [busy, setBusy] = useState(false);
  const [list, setList] = useState<Upgrade[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(!!guest);
  const [added, setAdded] = useState<Set<string>>(new Set());

  async function find(next = cap) {
    setBusy(true);
    setError(null);
    const r = await getBudgetUpgrades(deckId, next);
    setBusy(false);
    if (r.ok) return setList(r.upgrades);
    if (r.premium === false) setLocked(true);
    else setError(r.error);
  }

  return (
    <div className="card-frame mt-4 p-4">
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
        Budget upgrades <span className="text-gold-bright">· Premium</span>
      </h3>
      {locked ? (
        <p className="text-xs text-muted">
          See the cards most decks with this commander play that you don&apos;t have yet, under a price you pick.{" "}
          <Link href="/premium" className="text-gold-bright underline">
            Get Premium
          </Link>
        </p>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-1 text-xs">
            <span className="text-muted">Under</span>
            {CAPS.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setCap(c);
                  if (list) void find(c);
                }}
                className={`rounded border px-2 py-0.5 ${c === cap ? "border-gold text-gold-bright" : "border-border text-muted hover:border-gold"}`}
              >
                ${c}
              </button>
            ))}
          </div>
          {!list && (
            <button
              onClick={() => find()}
              disabled={busy}
              className="w-full rounded-md bg-gold px-3 py-2 text-xs font-semibold text-black hover:bg-gold-bright disabled:opacity-50"
            >
              {busy ? "Looking..." : "Suggest upgrades"}
            </button>
          )}
          {busy && list && <p className="text-xs text-muted">Looking...</p>}
          {error && <p className="text-xs text-red-600">{error}</p>}
          {list && !busy && list.length === 0 && <p className="text-xs text-muted">Nothing new under ${cap}. Try a higher price.</p>}
          {list && list.length > 0 && (
            <ul className="flex flex-col gap-2">
              {list.map((u) => (
                <li key={u.name} className="flex items-center gap-2">
                  {u.imageUrl && <Image src={u.imageUrl} alt="" width={32} height={45} className="rounded-sm" unoptimized />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-foreground">{u.name}</p>
                    <p className="text-[11px] text-muted">
                      ${u.usd.toFixed(2)} · in {Math.round(u.playRate * 100)}% of decks
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      await onAdd(u.name);
                      setAdded((s) => new Set(s).add(u.name));
                    }}
                    disabled={added.has(u.name)}
                    className="rounded border border-border px-2 py-0.5 text-[11px] text-foreground hover:border-gold disabled:opacity-50"
                  >
                    {added.has(u.name) ? "Added" : "Add"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
