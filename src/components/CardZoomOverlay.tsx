export default function CardZoomOverlay({
  src,
  alt,
  children,
  className,
}: {
  src?: string;
  alt: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`group/zoom relative ${className ?? ""}`}>
      {children}
      {src && (
        <div className="pointer-events-none absolute left-1/2 top-0 z-[100] hidden w-48 -translate-x-1/2 -translate-y-3 group-hover/zoom:block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} className="w-full rounded-lg shadow-2xl ring-1 ring-border" />
        </div>
      )}
    </div>
  );
}
