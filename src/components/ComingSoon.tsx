import Link from "next/link";

export default function ComingSoon({
  title,
  description,
  inspiredBy,
}: {
  title: string;
  description: string;
  inspiredBy: string;
}) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center sm:px-6">
      <span className="mb-3 rounded-full bg-surface-raised px-3 py-1 text-xs font-medium uppercase tracking-wide text-muted">
        Coming soon
      </span>
      <h1 className="text-3xl font-bold text-foreground">{title}</h1>
      <p className="mt-3 text-muted">{description}</p>
      <p className="mt-1 text-xs text-muted">Inspired by {inspiredBy}</p>
      <Link
        href="/commanders"
        className="mt-8 rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-black hover:bg-gold-bright"
      >
        Browse Commanders instead
      </Link>
    </div>
  );
}
