export default function CardNameZoom({ name, imageUrl }: { name: string; imageUrl?: string }) {
  return (
    <span className="group/namezoom relative inline-block min-w-0 flex-1">
      <span className="block truncate text-sm text-foreground">{name}</span>
      {imageUrl && (
        // Short delay before showing so scrolling past a decklist doesn't flash cards under the pointer;
        // hides instantly, no fade with reduced motion.
        <span className="pointer-events-none invisible absolute left-0 top-0 z-[100] w-48 -translate-y-3 opacity-0 transition-[opacity,visibility] duration-0 group-hover/namezoom:visible group-hover/namezoom:opacity-100 group-hover/namezoom:delay-200 group-hover/namezoom:duration-150 motion-reduce:group-hover/namezoom:duration-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt={name} className="w-full rounded-lg shadow-2xl ring-1 ring-border" />
        </span>
      )}
    </span>
  );
}
