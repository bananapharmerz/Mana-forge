"use client";

// Shown when a page hits an unexpected error. Visitors get a friendly message and a short
// reference code; the technical details only ever go to the server log.
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">Something misfired</p>
      <h1 className="mt-3 text-3xl font-bold text-foreground">That didn&apos;t work.</h1>
      <p className="mt-3 text-sm text-muted">
        Something went wrong on our side while loading this page. Please try again; if it keeps happening, let us know
        {error.digest ? (
          <>
            {" "}and mention code <span className="font-mono text-foreground">{error.digest}</span>
          </>
        ) : null}
        .
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <button onClick={() => retry()} className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black hover:bg-gold-bright">
          Try again
        </button>
        <a href="/" className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:border-gold">
          Go home
        </a>
      </div>
    </div>
  );
}
