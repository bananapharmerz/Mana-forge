"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getMyTier } from "@/app/actions/premium";
import TrialNudge from "@/components/TrialNudge";
import AdSlot from "@/components/AdSlot";
import PageHeader from "@/components/PageHeader";

const FREE_QUEUE_SECONDS = 30;

interface OpenRoom {
  code: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
}

export default function PlayLandingPage() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [queueSeconds, setQueueSeconds] = useState<number | null>(null);
  const [tier, setTier] = useState<string | null>(null);

  const [showOptions, setShowOptions] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [isOpen, setIsOpen] = useState(false);

  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [openRooms, setOpenRooms] = useState<OpenRoom[]>([]);

  // Whatever should actually happen once the free-tier queue finishes — creating a room or
  // joining one by code/from the open list all go through the same 30s gate.
  const pendingActionRef = useRef<(() => void) | null>(null);
  function startQueueOrRun(run: () => void) {
    if (tier === "premium") {
      run();
      return;
    }
    pendingActionRef.current = run;
    setQueueSeconds(FREE_QUEUE_SECONDS);
  }

  useEffect(() => {
    getMyTier().then(setTier);
  }, []);

  useEffect(() => {
    function loadOpenRooms() {
      fetch("/api/play/open")
        .then((r) => r.json())
        .then((d) => setOpenRooms(d.rooms ?? []))
        .catch(() => {});
    }
    loadOpenRooms();
    const interval = setInterval(loadOpenRooms, 5000);
    return () => clearInterval(interval);
  }, []);

  async function actuallyCreateRoom() {
    const res = await fetch("/api/play/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ maxPlayers, isOpen, name: roomName }),
    });
    const data = await res.json();
    setCreatedCode(data.code);
  }

  function openOptionsModal() {
    setRoomName("");
    setMaxPlayers(4);
    setIsOpen(false);
    setShowOptions(true);
  }

  function confirmCreateRoom() {
    setShowOptions(false);
    setCreating(true);
    startQueueOrRun(actuallyCreateRoom);
  }

  // Ticking down happens as a side effect of queueSeconds changing (not inside the
  // setState updater itself) so it isn't at risk of running twice under Strict Mode,
  // which intentionally double-invokes updater functions passed to setState.
  useEffect(() => {
    if (queueSeconds === null) return;
    if (queueSeconds <= 0) {
      pendingActionRef.current?.();
      pendingActionRef.current = null;
      return;
    }
    const t = setTimeout(() => setQueueSeconds((s) => (s === null ? s : s - 1)), 1000);
    return () => clearTimeout(t);
  }, [queueSeconds]);

  function joinRoom() {
    if (!joinCode.trim()) return;
    const code = joinCode.trim().toUpperCase();
    startQueueOrRun(() => router.push(`/play/${code}`));
  }

  function copyCode() {
    if (!createdCode) return;
    function fallbackCopy() {
      const textarea = document.createElement("textarea");
      textarea.value = createdCode!;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try {
        document.execCommand("copy");
      } catch {
        // ignored — clipboard access unavailable, user can still select the code manually
      }
      document.body.removeChild(textarea);
    }
    const showCopied = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(createdCode).then(showCopied, () => {
        fallbackCopy();
        showCopied();
      });
    } else {
      fallbackCopy();
      showCopied();
    }
  }

  if (createdCode) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center sm:px-6">
        <h1 className="text-2xl font-bold text-foreground">Room Created!</h1>
        <p className="mt-3 text-sm text-muted">
          Share this code with your friends, or copy it now.
        </p>
        <div className="mt-6 w-full rounded-lg border border-gold bg-surface px-6 py-5">
          <p className="text-5xl font-bold tracking-widest text-gold-bright">{createdCode}</p>
        </div>
        <button
          onClick={copyCode}
          className="mt-4 w-full rounded-md border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:border-gold"
        >
          {copied ? "Copied!" : "Copy to Clipboard"}
        </button>
        <button
          onClick={() => router.push(`/play/${createdCode}`)}
          className="mt-3 w-full rounded-lg bg-gold px-4 py-3 text-sm font-semibold text-black hover:bg-gold-bright"
        >
          Enter Room
        </button>
      </div>
    );
  }

  if (queueSeconds !== null) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center sm:px-6">
        <h1 className="text-3xl font-bold text-foreground">Starting your game...</h1>
        <p className="mt-3 text-5xl font-bold text-gold-bright">{queueSeconds}s</p>
        <div className="mt-6 w-full text-left">
          <TrialNudge>Free accounts wait {FREE_QUEUE_SECONDS}s before a game starts. Premium games start instantly.</TrialNudge>
        </div>
      </div>
    );
  }

  return (
    <>
    <PageHeader
      title="Play with friends"
      description="A shared tabletop for Commander games in your browser: life totals, hands and the battlefield stay in sync for everyone at the table."
      width="max-w-5xl"
    />
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-10 sm:px-6 md:grid-cols-[minmax(0,420px)_1fr]">
    <div className="flex flex-col">

      <button
        onClick={openOptionsModal}
        disabled={creating}
        className="w-full rounded-lg bg-gold px-5 py-3 text-sm font-semibold text-black hover:bg-[#d4a23e] disabled:opacity-50"
      >
        {creating ? "Starting..." : "Create a room"}
      </button>

      <div className="mt-6 flex w-full items-center gap-2">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="mt-6 flex w-full gap-2">
        <input
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
          placeholder="Enter room code"
          className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-center text-sm uppercase tracking-widest text-foreground placeholder:normal-case placeholder:tracking-normal placeholder:text-muted focus:border-gold focus:outline-none"
          maxLength={5}
        />
        <button
          onClick={joinRoom}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-gold"
        >
          Join
        </button>
      </div>

      {openRooms.length > 0 && (
        <div className="mt-8 w-full text-left">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Open Games
          </h2>
          <div className="flex flex-col gap-2">
            {openRooms.map((r) => (
              <button
                key={r.code}
                onClick={() => startQueueOrRun(() => router.push(`/play/${r.code}`))}
                className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2 text-sm hover:border-gold"
              >
                <div className="text-left">
                  <p className="font-semibold text-foreground">{r.name}</p>
                  <p className="text-[10px] tracking-widest text-muted">{r.code}</p>
                </div>
                <span className="text-xs text-muted">
                  {r.playerCount}/{r.maxPlayers} players — tap to join
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="mt-6 text-xs text-muted">
        Rooms close if the server restarts, so finish your game in one sitting.
      </p>

      <div className="empty:hidden mt-6 w-full">
        <AdSlot tier={tier} />
      </div>
    </div>

    <section aria-label="How a game works" className="md:pt-1">
      <h2 className="font-display text-2xl font-semibold text-foreground">How a game works</h2>
      <ol className="mt-4 space-y-5">
        {[
          ["Create a room", "Choose how many players and whether strangers can join from the open games list."],
          ["Share the code", "Send your friends the five-letter room code. They enter it here to sit down."],
          ["Bring a deck and play", "Everyone picks one of their decks. Draw, play cards and track life; every move shows up for the whole table at once."],
        ].map(([t, d], i) => (
          <li key={t} className="grid grid-cols-[2.25rem_1fr] gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/60 font-display text-lg font-semibold text-gold-bright">{i + 1}</span>
            <div>
              <p className="font-semibold text-foreground">{t}</p>
              <p className="mt-0.5 text-sm text-muted">{d}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>

      {showOptions && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowOptions(false)}
        >
          <div
            className="card-frame w-full max-w-sm p-5 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-foreground">Room Settings</h3>

            <p className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Game Name
            </p>
            <input
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Friday Night Commander"
              maxLength={40}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-gold focus:outline-none"
            />

            <p className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              How many players?
            </p>
            <div className="flex gap-2">
              {[2, 3, 4].map((n) => (
                <button
                  key={n}
                  onClick={() => setMaxPlayers(n)}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm font-semibold ${
                    maxPlayers === n
                      ? "border-gold bg-gold text-black"
                      : "border-border text-foreground hover:border-gold"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>

            <p className="mt-5 mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Session type
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setIsOpen(false)}
                className={`rounded-md border px-3 py-2 text-left text-sm ${
                  !isOpen ? "border-gold bg-surface-raised" : "border-border hover:border-gold"
                }`}
              >
                <span className="font-semibold text-foreground">Closed — room code only</span>
                <p className="text-xs text-muted">Only players with the code can join.</p>
              </button>
              <button
                onClick={() => setIsOpen(true)}
                className={`rounded-md border px-3 py-2 text-left text-sm ${
                  isOpen ? "border-gold bg-surface-raised" : "border-border hover:border-gold"
                }`}
              >
                <span className="font-semibold text-foreground">Open — anyone can pop in</span>
                <p className="text-xs text-muted">
                  Listed on the Play page for anyone to join until it&apos;s full.
                </p>
              </button>
            </div>

            <button
              onClick={confirmCreateRoom}
              className="mt-6 w-full rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-black hover:bg-gold-bright"
            >
              Create Room
            </button>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
