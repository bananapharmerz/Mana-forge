"use client";

import { useState } from "react";
import { reportDeck, type ReportReason } from "@/app/actions/reports";

const OPTIONS: { value: ReportReason; label: string }[] = [
  { value: "spam", label: "Spam or junk" },
  { value: "offensive", label: "Offensive name or content" },
  { value: "copyright", label: "Uses someone else's art" },
  { value: "other", label: "Something else" },
];

/** Small "Report deck" link that opens a short form; reports go to the admin's Nexus inbox. */
export default function ReportDeckButton({ deckId }: { deckId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("spam");
  const [details, setDetails] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");

  if (state === "done") return <p className="text-xs text-muted">Thanks — we&apos;ll take a look.</p>;

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs text-muted underline hover:text-gold-bright">
        Report deck
      </button>
    );
  }

  return (
    <form
      className="flex flex-col gap-2 rounded-md border border-border bg-surface p-3 text-xs"
      onSubmit={async (e) => {
        e.preventDefault();
        setState("sending");
        setError("");
        const res = await reportDeck(deckId, reason, details);
        if (res.ok) setState("done");
        else {
          setError(res.error);
          setState("idle");
        }
      }}
    >
      <label className="text-muted" htmlFor="report-reason">What&apos;s wrong with this deck?</label>
      <select
        id="report-reason"
        value={reason}
        onChange={(e) => setReason(e.target.value as ReportReason)}
        className="rounded border border-border bg-background px-2 py-1 text-foreground"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <textarea
        value={details}
        onChange={(e) => setDetails(e.target.value.slice(0, 500))}
        placeholder="Anything we should know? (optional)"
        rows={2}
        className="rounded border border-border bg-background px-2 py-1 text-foreground"
      />
      {error && <p className="text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={state === "sending"} className="rounded bg-gold px-3 py-1 font-semibold text-black disabled:opacity-50">
          {state === "sending" ? "Sending…" : "Send report"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-muted hover:text-foreground">Cancel</button>
      </div>
    </form>
  );
}
