export default function CardNameZoom({ name, imageUrl }: { name: string; imageUrl?: string }) {
  return (
    <span className="group/namezoom relative inline-block min-w-0 flex-1">
      <span className="block truncate text-sm text-foreground">{name}</span>
      {imageUrl && (
        <span className="pointer-events-none absolute left-0 top-0 z-[100] hidden w-48 -translate-y-3 group-hover/namezoom:block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt={name} className="w-full rounded-lg shadow-2xl ring-1 ring-border" />
        </span>
      )}
    </span>
  );
}
