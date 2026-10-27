"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AVATARS, avatarFor } from "@/lib/avatars";
import { updateProfile } from "@/app/actions/account";

// Edit the public profile: the display name shown as "by <name>" on your decks, and the profile
// picture — either an uploaded photo or one of the presets. Starts from the saved values; a blank
// name clears back to "Anonymous player".
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
  const fileRef = useRef<HTMLInputElement>(null);

  const isPhoto = typeof avatar === "string" && avatar.startsWith("data:");
  // What the picture looks like right now: the uploaded photo, or the preset/name-derived gradient.
  const preview = isPhoto ? null : avatarFor(avatar, name);

  // Resize a chosen image to a small 128px square JPEG data URL, so it stays well under the
  // server's size cap and is light enough to show on every deck card.
  async function toAvatarDataUrl(file: File): Promise<string> {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      const url = URL.createObjectURL(file);
      el.onload = () => {
        URL.revokeObjectURL(url);
        resolve(el);
      };
      el.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Couldn't read that image."));
      };
      el.src = url;
    });
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Image editing isn't available in this browser.");
    const s = Math.min(img.width, img.height); // centre-crop to a square
    ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
    let q = 0.72;
    let url = canvas.toDataURL("image/jpeg", q);
    while (url.length > 38000 && q > 0.4) {
      q -= 0.1;
      url = canvas.toDataURL("image/jpeg", q);
    }
    return url;
  }

  async function handleFile(file?: File) {
    setMsg(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) return setMsg({ ok: false, text: "Please choose an image file." });
    if (file.size > 10 * 1024 * 1024) return setMsg({ ok: false, text: "That image is too big — use one under 10MB." });
    try {
      const url = await toAvatarDataUrl(file);
      if (url.length > 40000) return setMsg({ ok: false, text: "Couldn't shrink that image enough — try a simpler photo." });
      setAvatar(url);
      setMsg(null);
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't use that image." });
    }
  }

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
        {isPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar as string} alt="Your profile picture" className="h-14 w-14 rounded-full object-cover" style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.18)" }} />
        ) : (
          <span
            aria-hidden
            className="flex items-center justify-center rounded-full"
            style={{
              width: 56,
              height: 56,
              fontSize: 29,
              background: `linear-gradient(135deg, ${preview!.from}, ${preview!.to})`,
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.18)",
            }}
          >
            {preview!.glyph}
          </span>
        )}
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

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = ""; // let the same file be re-picked
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:border-gold"
        >
          Upload a photo
        </button>
        {isPhoto && (
          <button
            type="button"
            onClick={() => setAvatar(null)}
            className="text-xs text-muted underline hover:text-foreground"
          >
            Remove photo
          </button>
        )}
      </div>

      <p className="mt-6 text-xs font-medium text-muted">Or pick a preset</p>
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

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black hover:bg-gold-bright disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save profile"}
        </button>
        {msg && <span className={`text-sm ${msg.ok ? "text-green-600" : "text-red-700"}`}>{msg.text}</span>}
      </div>
    </section>
  );
}
