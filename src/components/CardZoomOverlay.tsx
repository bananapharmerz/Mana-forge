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
        // The zoom waits ~0.2s before showing so a pointer passing over while scrolling doesn't flash
        // card images; it hides instantly, and skips the fade for people who prefer reduced motion.
        <div className="pointer-events-none invisible absolute left-1/2 top-0 z-[100] w-48 -translate-x-1/2 -translate-y-3 opacity-0 transition-[opacity,visibility] duration-0 group-hover/zoom:visible group-hover/zoom:opacity-100 group-hover/zoom:delay-200 group-hover/zoom:duration-150 motion-reduce:group-hover/zoom:duration-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} className="w-full rounded-lg shadow-2xl ring-1 ring-border" />
        </div>
      )}
    </div>
  );
}
