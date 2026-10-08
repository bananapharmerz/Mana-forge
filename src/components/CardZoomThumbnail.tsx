export default function CardZoomThumbnail({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="group/zoom relative w-16 shrink-0">
      <div className="overflow-hidden rounded" style={{ aspectRatio: "5 / 7" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="h-full w-full object-cover" loading="lazy" />
      </div>

      <div className="pointer-events-none absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 opacity-0 transition-opacity group-hover/zoom:opacity-100">
        <svg viewBox="0 0 24 24" className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <circle cx="10.5" cy="10.5" r="6.5" />
          <line x1="15.5" y1="15.5" x2="21" y2="21" strokeLinecap="round" />
          <line x1="10.5" y1="7.5" x2="10.5" y2="13.5" strokeLinecap="round" />
          <line x1="7.5" y1="10.5" x2="13.5" y2="10.5" strokeLinecap="round" />
        </svg>
      </div>

      <div className="pointer-events-none absolute left-1/2 top-0 z-[100] hidden w-48 -translate-x-1/2 -translate-y-3 group-hover/zoom:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="w-full rounded-lg shadow-2xl ring-1 ring-border" />
      </div>
    </div>
  );
}
