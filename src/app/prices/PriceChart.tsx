"use client";

import { useMemo, useRef, useState } from "react";

// A card's price over time: Now (today's price), 1 week, 1 month and 1 year. Daily points;
// hover or tap to read a day. Regular and foil prices can be switched when the card has both.

export interface PricePoint {
  day: string; // YYYY-MM-DD
  usd: number | null;
  usdFoil: number | null;
}

const RANGES = [
  { id: "now", label: "Now", days: 0 },
  { id: "1w", label: "1W", days: 7 },
  { id: "1m", label: "1M", days: 30 },
  { id: "1y", label: "1Y", days: 365 },
] as const;
type RangeId = (typeof RANGES)[number]["id"];

const W = 720;
const H = 260;
const PAD = { l: 56, r: 16, t: 16, b: 30 };

const money = (v: number) => `$${v < 10 ? v.toFixed(2) : v < 1000 ? v.toFixed(2) : Math.round(v).toLocaleString("en-US")}`;
const dayLabel = (d: string, long = false) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", long ? { month: "short", day: "numeric", year: "numeric" } : { month: "short", day: "numeric" });
const pct = (a: number, b: number) => (b ? ((a - b) / b) * 100 : 0);

export default function PriceChart({ history, current, currentFoil, target, today: todayKey }: { history: PricePoint[]; current: number | null; currentFoil: number | null; target?: number | null; today: string }) {
  const [range, setRange] = useState<RangeId>("1m");
  const hasFoil = currentFoil !== null || history.some((h) => h.usdFoil !== null);
  const hasRegular = current !== null || history.some((h) => h.usd !== null);
  const [foil, setFoil] = useState(!hasRegular && hasFoil);
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Today's live price is the last point, so the line always ends at "now".
  const series = useMemo(() => {
    const all = history.filter((h) => h.day < todayKey).concat([{ day: todayKey, usd: current, usdFoil: currentFoil }]);
    const days = RANGES.find((r) => r.id === range)!.days || 7;
    const from = new Date(Date.parse(`${todayKey}T00:00:00Z`) - days * 86400000).toISOString().slice(0, 10);
    return all
      .filter((p) => p.day >= from)
      .map((p) => ({ day: p.day, v: foil ? p.usdFoil : p.usd }))
      .filter((p): p is { day: string; v: number } => p.v !== null);
  }, [history, current, currentFoil, range, foil, todayKey]);

  const now = foil ? currentFoil : current;
  const firstDay = history.find((h) => (foil ? h.usdFoil : h.usd) !== null)?.day;
  const yesterday = [...history].reverse().find((h) =>  h.day < todayKey && (foil ? h.usdFoil : h.usd) !== null);
  const yv = yesterday ? (foil ? yesterday.usdFoil : yesterday.usd) : null;

  const vals = series.map((p) => p.v).concat(target && !foil ? [target] : []);
  const lo = vals.length ? Math.min(...vals) : 0;
  const hi = vals.length ? Math.max(...vals) : 1;
  const padV = (hi - lo) * 0.12 || hi * 0.1 || 1;
  const yMin = Math.max(0, lo - padV);
  const yMax = hi + padV;
  const x = (i: number) => PAD.l + (series.length > 1 ? (i / (series.length - 1)) * (W - PAD.l - PAD.r) : (W - PAD.l - PAD.r) / 2);
  const y = (v: number) => PAD.t + (1 - (v - yMin) / (yMax - yMin || 1)) * (H - PAD.t - PAD.b);
  const line = series.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
  const area = series.length > 1 ? `${line} L${x(series.length - 1).toFixed(1)},${H - PAD.b} L${x(0).toFixed(1)},${H - PAD.b} Z` : "";
  const up = series.length > 1 ? series[series.length - 1].v >= series[0].v : true;
  const stroke = up ? "#059669" : "#dc2626";
  const ticks = [0, 1, 2, 3].map((k) => yMin + ((yMax - yMin) * k) / 3);
  const xTicks = series.length > 1 ? [0, Math.floor((series.length - 1) / 2), series.length - 1] : [0];

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r || series.length < 1) return;
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * (series.length - 1));
    setHover(Math.max(0, Math.min(series.length - 1, i)));
  };
  const h = hover !== null ? series[hover] : null;
  const change = series.length > 1 ? pct(series[series.length - 1].v, series[0].v) : null;

  return (
    <div className="card-frame p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-border p-0.5" role="tablist" aria-label="Time range">
          {RANGES.map((r) => (
            <button
              key={r.id}
              role="tab"
              aria-selected={range === r.id}
              onClick={() => setRange(r.id)}
              className={`rounded-md px-3 py-1 text-xs font-semibold ${range === r.id ? "bg-gold text-black" : "text-muted hover:text-foreground"}`}
            >
              {r.label}
            </button>
          ))}
        </div>
        {hasFoil && hasRegular && (
          <div className="flex rounded-lg border border-border p-0.5 text-xs">
            {[false, true].map((f) => (
              <button key={String(f)} onClick={() => setFoil(f)} className={`rounded-md px-2.5 py-1 font-semibold ${foil === f ? "bg-surface-raised text-foreground" : "text-muted hover:text-foreground"}`}>
                {f ? "Foil" : "Regular"}
              </button>
            ))}
          </div>
        )}
        {range !== "now" && change !== null && (
          <span className={`ml-auto text-sm font-semibold ${change >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(1)}% over {RANGES.find((r) => r.id === range)!.label === "1W" ? "the week" : RANGES.find((r) => r.id === range)!.label === "1M" ? "the month" : "the year"}
          </span>
        )}
      </div>

      {range === "now" ? (
        <div className="flex flex-wrap items-end gap-x-8 gap-y-3 py-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">{foil ? "Foil" : "Price"} today</p>
            <p className="font-display text-5xl font-semibold text-foreground">{now !== null ? money(now) : "—"}</p>
          </div>
          {now !== null && yv != null && (
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">Since yesterday</p>
              <p className={`text-2xl font-semibold ${now >= yv ? "text-emerald-600" : "text-red-600"}`}>
                {now >= yv ? "▲" : "▼"} {money(Math.abs(now - yv))} ({Math.abs(pct(now, yv)).toFixed(1)}%)
              </p>
            </div>
          )}
          {target && !foil ? (
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">Your target</p>
              <p className="text-2xl font-semibold text-gold-bright">{money(target)}</p>
            </div>
          ) : null}
        </div>
      ) : series.length < 2 ? (
        <p className="py-16 text-center text-sm text-muted">
          Not enough price history for this range yet{firstDay ? `: recording started ${dayLabel(firstDay, true)}` : ""}. It fills in day by day.
        </p>
      ) : (
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full touch-none select-none"
          role="img"
          aria-label={`Price over ${RANGES.find((r) => r.id === range)!.label}: from ${money(series[0].v)} to ${money(series[series.length - 1].v)}`}
          onPointerMove={onMove}
          onPointerDown={onMove}
          onPointerLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id="pc-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
              <stop offset="100%" stopColor={stroke} stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="currentColor" className="text-border" strokeWidth="1" />
              <text x={PAD.l - 8} y={y(t) + 4} textAnchor="end" className="fill-current text-muted" fontSize="12">
                {money(t)}
              </text>
            </g>
          ))}
          {xTicks.map((i) => (
            <text key={i} x={x(i)} y={H - 8} textAnchor={i === 0 ? "start" : i === series.length - 1 ? "end" : "middle"} className="fill-current text-muted" fontSize="12">
              {i === series.length - 1 ? "Today" : dayLabel(series[i].day)}
            </text>
          ))}
          {target && !foil ? (
            <g>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(target)} y2={y(target)} stroke="#c9a24a" strokeDasharray="5 4" strokeWidth="1.5" />
              <text x={W - PAD.r} y={y(target) - 5} textAnchor="end" fontSize="11" fill="#a07d2e">
                your target {money(target)}
              </text>
            </g>
          ) : null}
          <path d={area} fill="url(#pc-fill)" />
          <path d={line} fill="none" stroke={stroke} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
          <circle cx={x(series.length - 1)} cy={y(series[series.length - 1].v)} r="3.5" fill={stroke} />
          {h && hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} stroke="currentColor" className="text-muted" strokeDasharray="3 3" />
              <circle cx={x(hover)} cy={y(h.v)} r="4.5" fill="#fff" stroke={stroke} strokeWidth="2" />
              <g transform={`translate(${Math.min(Math.max(x(hover), PAD.l + 60), W - PAD.r - 60)}, ${PAD.t + 4})`}>
                <rect x="-60" y="0" width="120" height="38" rx="6" fill="#1f1a12" opacity="0.92" />
                <text x="0" y="16" textAnchor="middle" fontSize="11" fill="#cdbf9e">
                  {hover === series.length - 1 ? "Today" : dayLabel(h.day, true)}
                </text>
                <text x="0" y="32" textAnchor="middle" fontSize="14" fontWeight="700" fill="#fff">
                  {money(h.v)}
                </text>
              </g>
            </g>
          )}
        </svg>
      )}
      {range !== "now" && series.length >= 2 && firstDay && range === "1y" && (
        <p className="mt-2 text-[11px] text-muted">History from {dayLabel(firstDay, true)}. The year fills in as days go by.</p>
      )}
    </div>
  );
}
