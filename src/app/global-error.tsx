"use client";

// Last-resort error page (when even the main layout fails). It has to bring its own <html>.
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f7f1e3", color: "#1d1a14" }}>
        <title>Something went wrong</title>
        <div style={{ maxWidth: 420, margin: "0 auto", padding: "96px 16px", textAlign: "center" }}>
          <h1 style={{ fontSize: 28, margin: 0 }}>That didn&apos;t work.</h1>
          <p style={{ color: "#6b6354", fontSize: 14, lineHeight: 1.5 }}>
            The site hit an unexpected problem. Please try again in a moment.
            {error.digest ? ` Reference: ${error.digest}` : ""}
          </p>
          <button
            onClick={() => retry()}
            style={{ marginTop: 16, padding: "10px 18px", borderRadius: 8, border: 0, background: "#c9a227", fontWeight: 600, cursor: "pointer" }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
