export interface ManaCurveBucket {
  label: string;
  pct: number;
}

export default function ManaCurveChart({ curve }: { curve: ManaCurveBucket[] }) {
  const max = Math.max(1, ...curve.map((b) => b.pct));

  return (
    <div className="flex gap-1.5">
      {curve.map((b) => (
        <div key={b.label} className="flex flex-1 flex-col items-center gap-1">
          <span className="text-[10px] text-muted">{b.pct > 0 ? `${b.pct.toFixed(0)}%` : ""}</span>
          <div className="relative h-24 w-full">
            <div
              className="absolute bottom-0 w-full rounded-t bg-gold"
              style={{ height: `${(b.pct / max) * 100}%`, minHeight: b.pct > 0 ? 4 : 0 }}
            />
          </div>
          <span className="text-[10px] text-muted">{b.label}</span>
        </div>
      ))}
    </div>
  );
}
