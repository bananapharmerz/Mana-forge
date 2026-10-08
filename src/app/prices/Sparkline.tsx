// A tiny 30-day price line. Gaps (days with no price) are skipped.
export default function Sparkline({ values, target, width = 120, height = 32 }: { values: (number | null)[]; target?: number | null; width?: number; height?: number }) {
  const pts = values.map((v, i) => [i, v] as const).filter((p): p is readonly [number, number] => p[1] !== null);
  if (pts.length < 2) return <span className="text-[10px] text-muted">collecting…</span>;
  const nums = pts.map((p) => p[1]).concat(target ? [target] : []);
  const lo = Math.min(...nums);
  const hi = Math.max(...nums);
  const span = hi - lo || 1;
  const x = (i: number) => (i / Math.max(1, values.length - 1)) * (width - 4) + 2;
  const y = (v: number) => height - 3 - ((v - lo) / span) * (height - 6);
  const d = pts.map(([i, v], n) => `${n ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const up = pts[pts.length - 1][1] >= pts[0][1];
  const last = pts[pts.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="30-day price trend" className="overflow-visible">
      {target ? <line x1="0" x2={width} y1={y(target)} y2={y(target)} stroke="currentColor" strokeDasharray="3 3" className="text-gold/60" /> : null}
      <path d={d} fill="none" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" className={up ? "stroke-emerald-600" : "stroke-red-600"} />
      <circle cx={x(last[0])} cy={y(last[1])} r="2.2" className={up ? "fill-emerald-600" : "fill-red-600"} />
    </svg>
  );
}
