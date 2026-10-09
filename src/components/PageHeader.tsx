import type { ReactNode } from "react";

// The band at the top of every inner page: dark forge iron with a low hearth glow, the page title in
// the display serif, and the five colours of Magic as the strip along its foot. It carries the
// homepage's forge look through the rest of the site.
export default function PageHeader({
  title,
  description,
  children,
  width = "max-w-6xl",
}: {
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode; // actions on the right (a button, a plan switch…)
  width?: string;
}) {
  return (
    <header className="forge-band relative overflow-hidden">
      <div className={`relative mx-auto flex ${width} flex-col gap-5 px-4 pb-10 pt-12 sm:flex-row sm:items-end sm:justify-between sm:px-6`}>
        <div className="max-w-2xl">
          <h1 className="font-display text-4xl font-semibold leading-[1.05] text-[#f5ecd6] sm:text-5xl">{title}</h1>
          {description && <p className="mt-3 text-[15px] leading-relaxed text-[#cdbf9e]">{description}</p>}
        </div>
        {children && <div className="shrink-0">{children}</div>}
      </div>
      <div className="mana-strip" aria-hidden />
    </header>
  );
}
