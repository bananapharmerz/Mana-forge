"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updatePublicProfile } from "@/app/actions/account";
import { USERNAME_MAX } from "@/lib/username";
import { STAT_CATALOG, MAX_STATS, type StatKey } from "@/lib/profileStats";

// Set up the public profile at /u/<username>: pick a unique handle, a short bio, and choose whether
// the profile (and the collection on it) is visible. Everything is opt-in — off until turned on.
export default function PublicProfileEditor({
  initialUsername,
  initialBio,
  initialPublic,
  initialShowCollection,
  initialStats,
}: {
  initialUsername: string | null;
  initialBio: string | null;
  initialPublic: boolean;
  initialShowCollection: boolean;
  initialStats: StatKey[];
}) {
  const router = useRouter();
  const [username, setUsername] = useState(initialUsername ?? "");
  const [bio, setBio] = useState(initialBio ?? "");
  const [isPublic, setIsPublic] = useState(initialPublic);
  const [showCollection, setShowCollection] = useState(initialShowCollection);
  const [stats, setStats] = useState<StatKey[]>(initialStats);

  // Pick up to MAX_STATS tiles. Clicking a chosen one removes it; order is the pick order.
  function toggleStat(key: StatKey, soon?: boolean) {
    if (soon) return;
    setStats((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : cur.length >= MAX_STATS ? cur : [...cur, key]));
  }
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  // The live handle, cleaned the same way the server will: lowercase, trim.
  const liveHandle = username.trim().toLowerCase();
  // The last saved handle is what the live link points at (not what's being typed).
  const [savedHandle, setSavedHandle] = useState(initialUsername);
  const [savedPublic, setSavedPublic] = useState(initialPublic);

  async function save() {
    setBusy(true);
    setMsg(null);
    const r = await updatePublicProfile({ username, bio, publicProfile: isPublic, showCollection, stats });
    setBusy(false);
    if (!r.ok) return setMsg({ ok: false, text: r.error });
    setSavedHandle(r.username);
    setSavedPublic(r.publicProfile);
    setMsg({ ok: true, text: r.publicProfile ? "Saved — your profile is live." : "Saved." });
    router.refresh();
  }

  const toggle = "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors";

  return (
    <section className="mt-8 border-t border-border pt-6">
      <h2 className="font-display text-lg font-semibold text-foreground">Public profile</h2>
      <p className="mt-1 text-sm text-muted">
        A shareable page at <span className="text-foreground">manaforgehub.com/u/your-name</span> with your
        decks, collection and posts. Off until you turn it on.
      </p>

      <label htmlFor="username" className="mt-5 block text-xs font-medium text-muted">
        Username
      </label>
      <div className="mt-1 flex items-stretch overflow-hidden rounded-md border border-border bg-surface focus-within:border-gold">
        <span className="flex select-none items-center pl-3 pr-1 text-sm text-muted">/u/</span>
        <input
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          maxLength={USERNAME_MAX}
          placeholder="yourname"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="w-full max-w-[14rem] bg-transparent py-2 pr-3 text-sm text-foreground focus:outline-none"
        />
      </div>
      <p className="mt-1 text-xs text-muted">
        Letters, numbers and underscores. 3–{USERNAME_MAX} characters. This is your public handle.
      </p>

      <label htmlFor="bio" className="mt-5 block text-xs font-medium text-muted">
        Bio <span className="text-muted/70">(optional)</span>
      </label>
      <textarea
        id="bio"
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        maxLength={160}
        rows={2}
        placeholder="Mono-red enjoyer. Always brewing."
        className="mt-1 w-full max-w-md resize-none rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-gold focus:outline-none"
      />

      <div className="mt-5 space-y-4">
        <ToggleRow
          label="Show my profile publicly"
          hint="Lets anyone with the link see your profile page."
          on={isPublic}
          onChange={() => setIsPublic((v) => !v)}
          toggleClass={toggle}
        />
        <ToggleRow
          label="Show my collection on it"
          hint="Adds a summary of the cards you've pulled from packs."
          on={showCollection}
          onChange={() => setShowCollection((v) => !v)}
          toggleClass={toggle}
        />
      </div>

      <div className="mt-6">
        <p className="text-xs font-medium text-muted">
          Profile stats <span className="text-muted/70">(pick up to {MAX_STATS})</span>
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {STAT_CATALOG.map((s) => {
            const active = stats.includes(s.key);
            const idx = stats.indexOf(s.key);
            const full = stats.length >= MAX_STATS && !active;
            const disabled = s.soon || full;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => toggleStat(s.key, s.soon)}
                disabled={disabled}
                aria-pressed={active}
                title={s.soon ? "Coming soon — once games are tracked" : undefined}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? "border-gold bg-gold/15 text-gold-bright"
                    : disabled
                      ? "cursor-not-allowed border-border text-muted/50"
                      : "border-border text-foreground hover:border-gold"
                }`}
              >
                {active && <span className="mr-1 text-[10px] text-muted">{idx + 1}</span>}
                {s.label}
                {s.soon && <span className="ml-1 text-[10px] uppercase text-muted/60">soon</span>}
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-xs text-muted">These are the number tiles shown at the top of your profile.</p>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-background hover:bg-gold-bright disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save profile"}
        </button>
        {savedHandle && savedPublic && (
          <Link href={`/u/${savedHandle}`} className="text-sm text-gold-bright underline hover:text-gold">
            View your profile →
          </Link>
        )}
        {msg && <span className={`text-sm ${msg.ok ? "text-green-600" : "text-red-700"}`}>{msg.text}</span>}
      </div>
      {liveHandle && !isPublic && (
        <p className="mt-2 text-xs text-muted">Your profile is hidden until you switch &ldquo;Show my profile publicly&rdquo; on.</p>
      )}
    </section>
  );
}

function ToggleRow({
  label,
  hint,
  on,
  onChange,
  toggleClass,
}: {
  label: string;
  hint: string;
  on: boolean;
  onChange: () => void;
  toggleClass: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={onChange}
        className={`${toggleClass} ${on ? "bg-gold" : "bg-surface-raised"}`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-background shadow transition-transform ${
            on ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
