"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AVATARS, avatarFor } from "@/lib/avatars";
import { updateProfile } from "@/app/actions/account";

// Edit the public profile: the display name shown as "by <name>" on your decks, and the profile
// picture (a preset). Starts from the saved values; a blank name clears back to "Anonymous player".
export default function ProfileEditor({
  initialName,
  initialAvatar,
}: {
  initialName: string | null;
  initialAvatar: string | null;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName ?? "");
  const [avatar, setAvatar] = useState<string | null>(initialAvatar);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // What the picture looks like right now (chosen preset, or the default from the typed name).
  const preview = avatarFor(avatar, name);

  async function save() {
    setBusy(true);
    setMsg(null);
    const r = await updateProfile(name, avatar);
    setBusy(false);
    if (!r.ok) return setMsg({ ok: false, text: r.error });
    setMsg({ ok: true, text: "Saved. Your decks now show this." });
    router.refresh();
  }

  const disc = "flex h-11 w-11 items-center justify-center rounded-full text-lg leading-none transition";

  return (
    <section className="mt-8 border-t border-border pt-6">
      <h2 className="font-display text-lg font-semibold text-foreground">Your profile</h2>
      <p className="mt-1 text-sm text-muted">
        This is how you appear on the decks you make public — the name and picture shown as
        &ldquo;by&nbsp;you.&rdquo;
      </p>

      <div className="mt-5 flex items-center gap-4">
        <span
          aria-hidden
          className="flex items-center justify-center rounded-full"
          style={{
            width: 56,
            height: 56,
            fontSize: 29,
            background: `linear-gradient(135deg, ${preview.from}, ${preview.to})`,
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.18)",
          }}
        >
          {preview.glyph}
        </span>
        <div className="flex-1">
          <label htmlFor="displayName" className="block text-xs font-medium text-muted">
            Display name
          </label>
          <input
            id="displayName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={30}
            placeholder="Anonymous player"
            className="mt-1 w-full max-w-xs rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-gold focus:outline-none"
          />
        </div>
      </div>

      <p className="mt-6 text-xs font-medium text-muted">Profile picture</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {AVATARS.map((a) => {
          const active = avatar === a.key;
          return (
            <button
              key={a.key}
              type="button"
              title={a.label}
              aria-label={a.label}
              aria-pressed={active}
              onClick={() => setAvatar(active ? null : a.key)}
              className={`${disc} ${active ? "ring-2 ring-gold ring-offset-2 ring-offset-background" : "opacity-80 hover:opacity-100"}`}
              style={{ background: `linear-gradient(135deg, ${a.from}, ${a.to})`, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.18)" }}
            >
              {a.glyph}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted">
        Tap your picture again to go back to the one picked from your name.
      </p>

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-background hover:bg-gold-bright disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save profile"}
        </button>
        {msg && <span className={`text-sm ${msg.ok ? "text-green-600" : "text-red-700"}`}>{msg.text}</span>}
      </div>
    </section>
  );
}
