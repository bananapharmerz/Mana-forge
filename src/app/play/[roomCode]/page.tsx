"use client";

import { use, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { listMyDecksForPlay, type DeckForPlay } from "@/app/actions/decks";
import type {
  CardInstance,
  PileZone,
  PlayerState,
  RoomState,
  DiceKind,
  RollResult,
  AlertPing,
} from "@/lib/gameRooms";
import CardBack from "@/components/CardBack";

const noopSubscribe = () => () => {};

function postAction(roomCode: string, playerId: string | null, type: string, payload: Record<string, unknown> = {}) {
  if (!playerId) return Promise.resolve(null);
  return fetch(`/api/play/${roomCode}/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, playerId, secret: getPlayerSecret(roomCode), ...payload }),
  });
}

function getPlayerId(roomCode: string): string {
  // sessionStorage (not localStorage) so each browser tab is its own seat at
  // the table — localStorage is shared across tabs of the same origin and
  // would make a second tab silently steal the first tab's identity.
  const key = `mtg-hub:playerId:${roomCode}`;
  let id = window.sessionStorage.getItem(key);
  if (!id) {
    id = Math.random().toString(36).slice(2, 12);
    window.sessionStorage.setItem(key, id);
  }
  return id;
}

// This tab's private key for its seat: sent with every action, never shown to other players,
// so nobody can play your cards by copying your player id from the room.
function getPlayerSecret(roomCode: string): string {
  const key = `mtg-hub:playerSecret:${roomCode}`;
  let s = window.sessionStorage.getItem(key);
  if (!s) {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes); // works on plain http too, unlike randomUUID
    s = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    window.sessionStorage.setItem(key, s);
  }
  return s;
}

const DRAG_THRESHOLD = 6;

type ZoneTab = "graveyard" | "exile";
type CardMenuZone = "battlefield" | ZoneTab | "commandZone" | "library";
type HoverCard = { instanceId: string; imageUrl?: string; name: string };
type PileMenuState = { x: number; y: number; source: PileZone };
type CardMenuState = {
  x: number;
  y: number;
  instanceId: string;
  name: string;
  zone?: CardMenuZone;
  hasBack?: boolean;
};
type ZoneViewerState = { playerId: string; tab: ZoneTab };
type DropDest = "battlefield" | "library-top" | "graveyard" | "exile" | "commandZone" | "hand";
type Ghost = { imageUrl?: string; name: string; x: number; y: number };
type Corner = "tl" | "tr" | "bl" | "br";

function zoneName(zone: PileZone) {
  return zone === "library" ? "Deck" : zone === "graveyard" ? "Graveyard" : "Exile";
}

// Seat color is fixed by join order (host is always 1st/blue), not by where the seat happens to
// render on any given viewer's screen — every player sees their own board bottom-right and
// everyone else arranged around it, but the color always identifies the same real player.
const PLAYER_SEAT_COLORS = ["#dbeafe", "#fee2e2", "#fef9c3", "#dcfce7"]; // blue, red, yellow, green

const DICE_KINDS: DiceKind[] = ["coin", "d4", "d6", "d8", "d10", "d12", "d20"];
const DICE_LABEL: Record<DiceKind, string> = {
  coin: "Coin",
  d4: "d4",
  d6: "d6",
  d8: "d8",
  d10: "d10",
  d12: "d12",
  d20: "d20",
};
// What the roll banner spins during the animation — the real d6 die face where one exists,
// otherwise a shape that at least distinguishes it from the others rather than one generic cube.
const DICE_ICON: Record<DiceKind, string> = {
  coin: "🪙",
  d4: "🔺",
  d6: "🎲",
  d8: "🔷",
  d10: "🔟",
  d12: "⬡",
  d20: "🔮",
};
// Filled in for anyone who joins without typing a name.
const PLANESWALKER_NAMES = [
  "Jace", "Chandra", "Gideon", "Liliana", "Nissa", "Ajani", "Elspeth", "Garruk",
  "Sorin", "Tamiyo", "Teferi", "Vraska", "Kaya", "Domri", "Nahiri", "Ral",
  "Huatli", "Dovin", "Saheeli", "Karn", "Ugin", "Kiora", "Jaya", "Narset",
  "Angrath", "Samut", "Grist", "Calix", "Ashiok", "Wrenn",
];

const HOTKEYS: { key: string; label: string }[] = [
  { key: "T", label: "Tap everything" },
  { key: "U", label: "Untap everything" },
  { key: "L", label: "Send Alert" },
  { key: "C", label: "Flip a coin" },
  { key: "4", label: "Roll d4" },
  { key: "6", label: "Roll d6" },
  { key: "8", label: "Roll d8" },
  { key: "0", label: "Roll d10" },
  { key: "2", label: "Roll d12" },
  { key: "3", label: "Roll d20" },
  { key: "S", label: "Shuffle your library" },
  { key: "R", label: "Draw a card" },
  { key: "G", label: "Move hovered card to graveyard" },
  { key: "X", label: "Move hovered card to exile" },
  { key: "[", label: "Move hovered card to top of library" },
  { key: "]", label: "Move hovered card to bottom of library" },
  { key: "D", label: "Create a copy of the hovered card" },
  { key: "Drag", label: "Rubber-band select multiple battlefield cards" },
  { key: "Shift+click", label: "Add/remove a card from the selection" },
  { key: "Esc", label: "Clear the current selection" },
  { key: "M", label: "Toggle game menu" },
  { key: "K", label: "Open token summoning window" },
  { key: "H", label: "Open this cheat sheet" },
];

// Short synthesized fanfare (a stand-in for a trumpet sample) — three rising notes over ~0.5s.
function playAlertSound() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    [880, 1108, 1318].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = freq;
      const t = now + i * 0.12;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.2, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.16);
    });
    setTimeout(() => ctx.close(), 700);
  } catch {
    // Web Audio unavailable/blocked — banner still shows without sound.
  }
}

export default function PlayRoomPage({
  params,
}: {
  params: Promise<{ roomCode: string }>;
}) {
  const { roomCode } = use(params);
  const router = useRouter();

  // This tab's seat id (sessionStorage), read once the page is in the browser.
  const playerId = useSyncExternalStore(
    noopSubscribe,
    () => getPlayerId(roomCode),
    () => null
  );
  const [room, setRoom] = useState<RoomState | null>(null);
  const [joined, setJoined] = useState(false);
  const [name, setName] = useState("");
  const [decks, setDecks] = useState<DeckForPlay[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string>("");
  const [joinError, setJoinError] = useState<string | null>(null);

  // Battlefield-internal dragging (repositioning a card already on the field, or dropping it
  // onto one of your own piles instead). Only commits a move/drop once the pointer has actually
  // traveled past a small threshold — otherwise a plain click would *also* fire a spurious
  // "move to click position" alongside the tap toggle, which is what broke untapping: the card's
  // rotated bounding box visually drifts from its stored x/y after every such phantom move, so
  // the next click increasingly misses the card entirely.
  const [dragging, setDragging] = useState<{ instanceId: string; x: number; y: number } | null>(
    null
  );
  const boardDragStartRef = useRef<{
    instanceId: string;
    x: number;
    y: number;
    // Present when the dragged card is part of a multi-card selection: each selected card's
    // board-percentage position at drag start, so the whole group can move by the same delta
    // the dragged (anchor) card moves, preserving their positions relative to each other.
    group?: Map<string, { x: number; y: number }>;
  } | null>(null);
  const draggingRef = useRef<{ instanceId: string; x: number; y: number } | null>(null);
  useEffect(() => {
    draggingRef.current = dragging;
  }, [dragging]);
  const [boardDragActive, setBoardDragActive] = useState(false);

  // Multi-select: rubber-band a rectangle over your own battlefield (like desktop icon
  // selection) to select several cards at once, then G/X/[/] act on the whole group instead of
  // just the hovered card. Shift-click a card to add/remove it from the selection individually.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectedIdsRef = useRef<Set<string>>(selectedIds);
  useEffect(() => {
    selectedIdsRef.current = selectedIds;
  }, [selectedIds]);
  const [marqueeActive, setMarqueeActive] = useState(false);
  const marqueeStartRef = useRef<{ x: number; y: number } | null>(null);
  const [marqueeRect, setMarqueeRect] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(
    null
  );

  // Cross-zone dragging: starts outside the board (hand strip, or a graveyard/exile drawer) and
  // needs a document-level pointerup listener since the drop target can be anywhere on the page.
  const [crossDrag, setCrossDrag] = useState<{
    instanceId: string;
    quickAction: "play" | "toHand" | null;
    searchSource?: PileZone;
  } | null>(null);
  const crossDragStartRef = useRef<{ x: number; y: number } | null>(null);

  // Dragging a token out of the Tokens window: there's no existing CardInstance to move (tokens
  // are summoned fresh), so this tracks a scryfallId + display info instead of an instanceId.
  const [tokenDrag, setTokenDrag] = useState<{ scryfallId: string } | null>(null);
  const tokenDragStartRef = useRef<{ x: number; y: number } | null>(null);
  const [ghost, setGhost] = useState<Ghost | null>(null);
  // Whichever drop zone (deck/graveyard/exile/commandZone/hand) the pointer is currently over
  // during any drag — piles read this to "swallow" (expand) while a card hovers, then shrink
  // back once it's released.
  const [hoveredDropZone, setHoveredDropZone] = useState<string | null>(null);

  const boardRef = useRef<HTMLDivElement>(null);

  const [hoverCard, setHoverCard] = useState<HoverCard | null>(null);
  const [pileMenu, setPileMenu] = useState<PileMenuState | null>(null);
  const [cardMenu, setCardMenu] = useState<CardMenuState | null>(null);
  const [promptFor, setPromptFor] = useState<"scry" | "drawX" | null>(null);
  const [promptValue, setPromptValue] = useState("1");
  const [showSearch, setShowSearch] = useState<PileZone | null>(null);
  const [zoneViewer, setZoneViewer] = useState<ZoneViewerState | null>(null);
  const zoneDrawerRef = useRef<HTMLDivElement>(null);

  const [showLifeMenu, setShowLifeMenu] = useState(false);
  const [showMoreCounters, setShowMoreCounters] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [counterPromptOpen, setCounterPromptOpen] = useState(false);
  const [counterPromptValue, setCounterPromptValue] = useState("1");

  // Game menu: dice/coins, hotkeys cheat sheet, save/load, end game.
  const [showGameMenu, setShowGameMenu] = useState(false);
  const [gameMenuTab, setGameMenuTab] = useState<"dice" | "hotkeys" | "save" | "end" | null>(null);
  const [diceKind, setDiceKind] = useState<DiceKind>("coin");
  const [diceCount, setDiceCount] = useState("1");
  const [activeRoll, setActiveRoll] = useState<RollResult | null>(null);
  const [rollAnimating, setRollAnimating] = useState(false);
  const seenRollId = useRef<string | null>(null);
  const [activeAlert, setActiveAlert] = useState<AlertPing | null>(null);
  const seenAlertId = useRef<string | null>(null);
  const bannerInitRef = useRef(false);
  const [endStage, setEndStage] = useState<"confirm" | "winner" | "choice" | "newDeck" | null>(null);
  const [winnerChoice, setWinnerChoice] = useState("");
  const [newDeckId, setNewDeckId] = useState("");
  const gameMenuRef = useRef<HTMLDivElement>(null);
  const [mulliganCount, setMulliganCount] = useState("");
  const [showTokens, setShowTokens] = useState(false);
  const tokensRef = useRef<HTMLDivElement>(null);

  // Flashes a brief animation on a player's Deck tile right when their library gets shuffled —
  // driven off the log line shuffleLibrary() writes, so it fires for both the hotkey and the
  // existing pile-menu "Shuffle" option without duplicating the trigger logic.
  const [shuffleFlash, setShuffleFlash] = useState<Record<string, number>>({});
  const seenLogLenRef = useRef<number | null>(null);
  useEffect(() => {
    if (!room) return;
    const lines = room.log;
    if (seenLogLenRef.current === null) {
      // First snapshot (including on a reconnect mid-game) — don't replay history.
      seenLogLenRef.current = lines.length;
      return;
    }
    if (lines.length <= seenLogLenRef.current) {
      seenLogLenRef.current = lines.length;
      return;
    }
    const fresh = lines.slice(seenLogLenRef.current);
    seenLogLenRef.current = lines.length;
    for (const line of fresh) {
      const match = line.match(/^(.+) shuffled their library\.$/);
      if (!match) continue;
      const player = Object.values(room.players).find((p) => p.name === match[1]);
      if (!player) continue;
      setShuffleFlash((f) => ({ ...f, [player.id]: Date.now() }));
      setTimeout(() => {
        setShuffleFlash((f) => {
          const next = { ...f };
          delete next[player.id];
          return next;
        });
      }, 700);
    }
  }, [room]);

  useEffect(() => {
    listMyDecksForPlay().then(setDecks);
  }, [roomCode]);

  // Watch for a fresh dice/coin roll or alert ping and surface it as a banner to everyone —
  // skip the very first room snapshot so a page refresh doesn't replay whatever was last rolled.
  useEffect(() => {
    if (!room) return;
    if (!bannerInitRef.current) {
      bannerInitRef.current = true;
      seenRollId.current = room.lastRoll?.id ?? null;
      seenAlertId.current = room.lastAlert?.id ?? null;
      return;
    }
    if (room.lastRoll && seenRollId.current !== room.lastRoll.id) {
      seenRollId.current = room.lastRoll.id;
      setRollAnimating(true);
      setActiveRoll(room.lastRoll);
      setTimeout(() => setRollAnimating(false), 700);
      setTimeout(() => setActiveRoll(null), 3200);
    }
    if (room.lastAlert && seenAlertId.current !== room.lastAlert.id) {
      seenAlertId.current = room.lastAlert.id;
      setActiveAlert(room.lastAlert);
      playAlertSound();
      setTimeout(() => setActiveAlert(null), 1800);
    }
  }, [room]);

  // Stable refs so the keydown listener below doesn't need to be torn down and re-registered on
  // every room broadcast or mouse hover — it reads the latest values through these instead.
  const roomRef = useRef<RoomState | null>(null);
  useEffect(() => {
    roomRef.current = room;
  }, [room]);
  const hoverCardRef = useRef<HoverCard | null>(null);
  useEffect(() => {
    hoverCardRef.current = hoverCard;
  }, [hoverCard]);

  // Global hotkeys — skipped while typing in an input/textarea/select.
  useEffect(() => {
    // Only acts on cards the current player actually owns — hovering an opponent's card (their
    // battlefield, revealed cards, etc.) must not let you move or copy it.
    function findMyHoveredInstanceId(): string | null {
      const hovered = hoverCardRef.current;
      const me = roomRef.current?.players[playerId ?? ""];
      if (!hovered || !me) return null;
      const zones = [
        me.hand,
        me.battlefield,
        me.graveyard,
        me.exile,
        me.revealed,
        me.scrying,
        me.commandZone,
        me.library,
      ];
      return zones.some((z) => z.some((c) => c.instanceId === hovered.instanceId))
        ? hovered.instanceId
        : null;
    }

    // Copy is the one hotkey that's allowed to reach across the table — it always creates the
    // copy on your own battlefield, so hovering any player's card (yours or an opponent's) and
    // pressing the key works the same way.
    function findAnyHoveredInstanceId(): string | null {
      const hovered = hoverCardRef.current;
      const players = roomRef.current?.players;
      if (!hovered || !players) return null;
      const owns = Object.values(players).some((p) =>
        [p.hand, p.battlefield, p.graveyard, p.exile, p.revealed, p.scrying, p.commandZone, p.library].some(
          (z) => z.some((c) => c.instanceId === hovered.instanceId)
        )
      );
      return owns ? hovered.instanceId : null;
    }

    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (!joined || !playerId) return;
      switch (e.key.toLowerCase()) {
        case "t":
          sendAction("tapAllBattlefield", { tapped: true });
          break;
        case "u":
          sendAction("tapAllBattlefield", { tapped: false });
          break;
        case "l":
          sendAction("sendAlert");
          break;
        case "c":
          sendAction("rollDice", { kind: "coin", count: 1 });
          break;
        case "s":
          sendAction("shuffle");
          break;
        case "r":
          sendAction("pileDraw", { source: "library" });
          break;
        case "g": {
          const id = findMyHoveredInstanceId();
          if (id) sendAction("dropCardOn", { instanceId: id, dest: "graveyard" });
          break;
        }
        case "x": {
          const id = findMyHoveredInstanceId();
          if (id) sendAction("dropCardOn", { instanceId: id, dest: "exile" });
          break;
        }
        case "[": {
          const id = findMyHoveredInstanceId();
          if (id) sendAction("moveCardToLibrary", { instanceId: id, position: "top" });
          break;
        }
        case "]": {
          const id = findMyHoveredInstanceId();
          if (id) sendAction("moveCardToLibrary", { instanceId: id, position: "bottom" });
          break;
        }
        case "escape":
          setSelectedIds(new Set());
          break;
        case "d": {
          const id = findAnyHoveredInstanceId();
          if (id) sendAction("copyCard", { instanceId: id });
          break;
        }
        case "4":
          sendAction("rollDice", { kind: "d4", count: 1 });
          break;
        case "6":
          sendAction("rollDice", { kind: "d6", count: 1 });
          break;
        case "8":
          sendAction("rollDice", { kind: "d8", count: 1 });
          break;
        case "0":
          sendAction("rollDice", { kind: "d10", count: 1 });
          break;
        case "2":
          sendAction("rollDice", { kind: "d12", count: 1 });
          break;
        case "3":
          sendAction("rollDice", { kind: "d20", count: 1 });
          break;
        case "m":
          setShowGameMenu((s) => !s);
          return;
        case "k":
          setShowTokens((s) => !s);
          return;
        case "h":
          setShowGameMenu(true);
          setGameMenuTab("hotkeys");
          return;
        default:
          return;
      }
      e.preventDefault();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joined, playerId, roomCode]);

  useEffect(() => {
    const es = new EventSource(`/api/play/${roomCode}/stream`);
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      setRoom(data);
    };
    return () => es.close();
  }, [roomCode]);

  // Once this tab holds a seat in the room it stays "joined" (adjusting state during render).
  if (!joined && playerId && room?.players[playerId]) setJoined(true);

  // Close the graveyard/exile drawer on an outside click, in addition to its own X button.
  useEffect(() => {
    if (!zoneViewer) return;
    function onDown(e: PointerEvent) {
      if (zoneDrawerRef.current && !zoneDrawerRef.current.contains(e.target as Node)) {
        setZoneViewer(null);
      }
    }
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [zoneViewer]);

  // Close the game menu on an outside click — but not mid-way through the end-game flow, where
  // an accidental outside click shouldn't silently drop a save/discard/winner selection.
  useEffect(() => {
    if (!showGameMenu || endStage) return;
    function onDown(e: PointerEvent) {
      if (gameMenuRef.current && !gameMenuRef.current.contains(e.target as Node)) {
        setShowGameMenu(false);
        setGameMenuTab(null);
      }
    }
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [showGameMenu, endStage]);

  // Close the token summoning window on an outside click, in addition to its own X button.
  useEffect(() => {
    if (!showTokens) return;
    function onDown(e: PointerEvent) {
      if (tokensRef.current && !tokensRef.current.contains(e.target as Node)) {
        setShowTokens(false);
      }
    }
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [showTokens]);

  function sendAction(type: string, payload: Record<string, unknown> = {}) {
    return postAction(roomCode, playerId, type, payload);
  }

  async function handleJoin() {
    setJoinError(null);
    const deck = decks.find((d) => d.id === selectedDeckId);
    const taken = new Set(Object.values(room?.players ?? {}).map((p) => p.name));
    const availableNames = PLANESWALKER_NAMES.filter((n) => !taken.has(n));
    const randomName = (availableNames.length > 0 ? availableNames : PLANESWALKER_NAMES)[
      Math.floor(Math.random() * (availableNames.length > 0 ? availableNames.length : PLANESWALKER_NAMES.length))
    ];
    const res = await sendAction("join", {
      name: name.trim() || randomName,
      deckCards: deck?.cards ?? [],
      cardBackUrl: deck?.cardBackUrl ?? undefined,
      commanderName: deck?.commanderName,
      commanderCard: deck?.commanderCard,
      tokenCards: deck?.tokenCards ?? [],
      extraCommandZoneCard: deck?.partnerCommanderCard ?? deck?.companionCard,
      extraCommandZoneKind: deck?.partnerCommanderCard ? "partner" : "companion",
    });
    if (res && !res.ok) {
      const data = await res.json().catch(() => ({}));
      setJoinError(data.error ?? "Couldn't join this room.");
      return;
    }
    // Remembered so a reconnect (page refresh, tab reopened) can re-sync the token list below
    // without re-running the rest of the join flow (which would be a no-op for an existing seat).
    if (selectedDeckId) window.sessionStorage.setItem(`mtg-hub:deckId:${roomCode}`, selectedDeckId);
  }

  // Reconnecting to a seat you already hold skips the join form entirely (see the `joined`
  // effect below), so it never resends the deck's current token list — meaning a token added to
  // the deck after the original join would silently never show up. This re-sends just that, once
  // per mount, as soon as both the room and the deck list are available.
  const tokenResyncRef = useRef(false);
  useEffect(() => {
    if (tokenResyncRef.current) return;
    if (!playerId || !room?.players[playerId] || decks.length === 0) return;
    tokenResyncRef.current = true;
    const savedDeckId = window.sessionStorage.getItem(`mtg-hub:deckId:${roomCode}`);
    const deck = savedDeckId ? decks.find((d) => d.id === savedDeckId) : undefined;
    if (!deck) return;
    sendAction("join", { name: room.players[playerId].name, tokenCards: deck.tokenCards });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, playerId, decks]);

  // --- Battlefield-internal drag (existing cards) ---
  // `dragging` state is deliberately NOT created on pointerdown — only once the pointer has
  // actually crossed the movement threshold. Setting it immediately on every press (even a
  // plain click) used to override the card's rendered x/y with the click coordinates for the
  // duration of the press, then snap back on release — combined with the tap-toggle's rotation
  // transition, that snap-there-and-back read as the card "shaking" instead of cleanly untapping.

  // Shared by both drag systems below — whichever pile the pointer is currently over "swallows"
  // (expands) as a drop-target cue, and shrinks back once nothing is being dragged over it.
  function updateHoveredDropZone(clientX: number, clientY: number) {
    const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    const pileEl = el?.closest("[data-pile]");
    setHoveredDropZone(pileEl ? pileEl.getAttribute("data-pile") : null);
  }

  function startDrag(card: CardInstance, e: React.PointerEvent) {
    e.stopPropagation();
    let group: Map<string, { x: number; y: number }> | undefined;
    if (selectedIds.size > 1 && selectedIds.has(card.instanceId)) {
      const me = roomRef.current?.players[playerId ?? ""];
      if (me) {
        group = new Map();
        for (const id of selectedIds) {
          const c = me.battlefield.find((bc) => bc.instanceId === id);
          if (c) group.set(id, { x: c.x, y: c.y });
        }
      }
    }
    boardDragStartRef.current = { instanceId: card.instanceId, x: e.clientX, y: e.clientY, group };
    setBoardDragActive(true);
    setGhost({ imageUrl: card.imageUrl, name: card.name, x: e.clientX, y: e.clientY });
  }

  function toggleSelect(instanceId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(instanceId)) next.delete(instanceId);
      else next.add(instanceId);
      return next;
    });
  }

  // Tapping any card that's part of a multi-card selection taps (or untaps) the whole group to
  // match — the clicked card's new state (its current state, flipped) is what every selected
  // card ends up at, not an independent per-card toggle.
  function groupTap(tapped: boolean) {
    selectedIds.forEach((id) => sendAction("setCardTapped", { instanceId: id, tapped }));
  }

  // Rubber-band select: pointerdown on the battlefield's own empty background (not a card, not a
  // pile tile — those stop propagation before this fires) starts a drag rectangle. A drag that
  // never crosses the movement threshold is just a plain click and clears the selection instead.
  function startMarquee(e: React.PointerEvent) {
    if (e.target !== e.currentTarget) return;
    marqueeStartRef.current = { x: e.clientX, y: e.clientY };
    setMarqueeActive(true);
    setMarqueeRect({ x0: e.clientX, y0: e.clientY, x1: e.clientX, y1: e.clientY });
  }

  // Document-level (not element-scoped) on purpose: the command zone and hand row both sit
  // outside the battlefield's own box, so a drag that ends there needs to keep tracking no
  // matter where the pointer travels — the same reason cross-zone drags below use `document`.
  // Visual feedback is the same fixed-position ghost cross-zone drags use (see below) rather
  // than moving the real card — the real card lives inside a stacking context that a later
  // sibling (the header, command zone, or hand row) can still paint over, so it would visually
  // vanish once the drag crossed outside the battlefield's own box.
  useEffect(() => {
    if (!boardDragActive) return;

    function onMove(e: PointerEvent) {
      const start = boardDragStartRef.current;
      const board = boardRef.current;
      if (!start || !board) return;
      setGhost((g) => (g ? { ...g, x: e.clientX, y: e.clientY } : g));
      updateHoveredDropZone(e.clientX, e.clientY);
      const rect = board.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      if (!draggingRef.current) {
        const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y) > DRAG_THRESHOLD;
        if (!moved) return;
        setDragging({ instanceId: start.instanceId, x, y });
      } else {
        setDragging((d) => (d ? { ...d, x, y } : d));
      }
    }

    function onUp(e: PointerEvent) {
      const start = boardDragStartRef.current;
      boardDragStartRef.current = null;
      setBoardDragActive(false);
      setGhost(null);
      setHoveredDropZone(null);
      if (!start) return;
      const current = draggingRef.current;
      if (!current) {
        // never crossed the movement threshold — a plain click, already handled by onClick (tap)
        return;
      }
      const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      const pileEl = target?.closest("[data-pile]");
      const group = start.group;
      if (group && group.size > 1) {
        if (pileEl) {
          const dest = pileEl.getAttribute("data-pile") as DropDest;
          group.forEach((_, id) => postAction(roomCode, playerId, "dropCardOn", { instanceId: id, dest }));
          setSelectedIds(new Set());
        } else {
          // Every selected card moves by the same delta the dragged (anchor) card moved, so the
          // group keeps its shape instead of collapsing onto the pointer.
          const anchorStart = group.get(current.instanceId);
          const deltaX = anchorStart ? current.x - anchorStart.x : 0;
          const deltaY = anchorStart ? current.y - anchorStart.y : 0;
          group.forEach((pos, id) => {
            postAction(roomCode, playerId, "move", { instanceId: id, x: pos.x + deltaX, y: pos.y + deltaY });
          });
        }
      } else if (pileEl) {
        const dest = pileEl.getAttribute("data-pile") as DropDest;
        postAction(roomCode, playerId, "dropCardOn", { instanceId: current.instanceId, dest });
      } else {
        postAction(roomCode, playerId, "move", { instanceId: current.instanceId, x: current.x, y: current.y });
      }
      setDragging(null);
    }

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };
  }, [boardDragActive, roomCode, playerId]);

  useEffect(() => {
    if (!marqueeActive) return;

    function onMove(e: PointerEvent) {
      const start = marqueeStartRef.current;
      if (!start) return;
      setMarqueeRect({ x0: start.x, y0: start.y, x1: e.clientX, y1: e.clientY });
    }

    function onUp(e: PointerEvent) {
      const start = marqueeStartRef.current;
      marqueeStartRef.current = null;
      setMarqueeActive(false);
      setMarqueeRect(null);
      if (!start) return;
      const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y) > DRAG_THRESHOLD;
      if (!moved) {
        setSelectedIds(new Set());
        return;
      }
      const rx0 = Math.min(start.x, e.clientX);
      const rx1 = Math.max(start.x, e.clientX);
      const ry0 = Math.min(start.y, e.clientY);
      const ry1 = Math.max(start.y, e.clientY);
      const board = boardRef.current;
      if (!board) return;
      const cardEls = board.querySelectorAll<HTMLElement>("[data-instance-id]");
      const next = new Set<string>();
      cardEls.forEach((el) => {
        const r = el.getBoundingClientRect();
        const overlaps = r.left < rx1 && r.right > rx0 && r.top < ry1 && r.bottom > ry0;
        if (overlaps) {
          const id = el.getAttribute("data-instance-id");
          if (id) next.add(id);
        }
      });
      setSelectedIds(next);
    }

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };
  }, [marqueeActive]);

  // --- Cross-zone drag: hand cards, or cards inside the graveyard/exile drawer. Works from any
  // zone because the server locates the card by instanceId wherever it currently is. ---

  function startCrossDrag(
    instanceId: string,
    quickAction: "play" | "toHand" | null,
    card: CardInstance,
    e: React.PointerEvent,
    searchSource?: PileZone
  ) {
    crossDragStartRef.current = { x: e.clientX, y: e.clientY };
    setCrossDrag({ instanceId, quickAction, searchSource });
    setGhost({ imageUrl: card.imageUrl, name: card.name, x: e.clientX, y: e.clientY });
  }

  useEffect(() => {
    if (!crossDrag) return;

    function onMove(e: PointerEvent) {
      setGhost((g) => (g ? { ...g, x: e.clientX, y: e.clientY } : g));
      updateHoveredDropZone(e.clientX, e.clientY);
    }

    function onUp(e: PointerEvent) {
      setHoveredDropZone(null);
      if (!crossDrag) return;
      const start = crossDragStartRef.current;
      const moved = start ? Math.hypot(e.clientX - start.x, e.clientY - start.y) > DRAG_THRESHOLD : false;

      if (moved) {
        const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
        const pileEl = target?.closest("[data-pile]");
        if (pileEl) {
          const dest = pileEl.getAttribute("data-pile") as DropDest;
          sendAction("dropCardOn", { instanceId: crossDrag.instanceId, dest });
        } else if (boardRef.current && target && boardRef.current.contains(target)) {
          const rect = boardRef.current.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * 100;
          const y = ((e.clientY - rect.top) / rect.height) * 100;
          sendAction("dropCardOn", { instanceId: crossDrag.instanceId, dest: "battlefield", x, y });
        }
        // dropped somewhere invalid — card just stays where it was
      } else if (crossDrag.quickAction === "play") {
        // a plain click on a hand card (no real movement) — quick-play to a random spot
        sendAction("play", { instanceId: crossDrag.instanceId });
      } else if (crossDrag.quickAction === "toHand" && crossDrag.searchSource) {
        // a plain click on a card in the search window — take it straight into hand
        sendAction("pileSearchMoveToHand", {
          source: crossDrag.searchSource,
          instanceId: crossDrag.instanceId,
        });
      }
      // Dragging or clicking a card out of the search window resolves it one way or another —
      // close the window either way instead of leaving it open over a card that's now moved.
      if (crossDrag.searchSource) setShowSearch(null);
      setCrossDrag(null);
      setGhost(null);
      crossDragStartRef.current = null;
    }

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crossDrag]);

  function startTokenDrag(scryfallId: string, name: string, imageUrl: string | undefined, e: React.PointerEvent) {
    tokenDragStartRef.current = { x: e.clientX, y: e.clientY };
    setTokenDrag({ scryfallId });
    setGhost({ imageUrl, name, x: e.clientX, y: e.clientY });
  }

  useEffect(() => {
    if (!tokenDrag) return;

    function onMove(e: PointerEvent) {
      setGhost((g) => (g ? { ...g, x: e.clientX, y: e.clientY } : g));
    }

    function onUp(e: PointerEvent) {
      if (!tokenDrag) return;
      const start = tokenDragStartRef.current;
      const moved = start ? Math.hypot(e.clientX - start.x, e.clientY - start.y) > DRAG_THRESHOLD : false;

      if (moved && boardRef.current) {
        const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
        if (target && boardRef.current.contains(target)) {
          const rect = boardRef.current.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * 100;
          const y = ((e.clientY - rect.top) / rect.height) * 100;
          sendAction("summonToken", { scryfallId: tokenDrag.scryfallId, x, y });
        }
        // dropped somewhere other than your own board — nothing summoned
      } else if (!moved) {
        // a plain click (no real movement) — summon at a random spot, same as before drag existed
        sendAction("summonToken", { scryfallId: tokenDrag.scryfallId });
      }
      setTokenDrag(null);
      setGhost(null);
      tokenDragStartRef.current = null;
    }

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenDrag]);

  function closePileMenu() {
    setPileMenu(null);
    setPromptFor(null);
  }

  function pileMenuAction(type: string, payload: Record<string, unknown> = {}) {
    if (!pileMenu) return;
    sendAction(type, { source: pileMenu.source, ...payload });
    closePileMenu();
  }

  function openPileMenu(e: React.MouseEvent, source: PileZone) {
    e.preventDefault();
    setPromptFor(null);
    setPileMenu({ x: e.clientX, y: e.clientY, source });
  }

  function openCardMenu(e: React.MouseEvent, card: CardInstance, zone?: CardMenuZone) {
    e.preventDefault();
    e.stopPropagation();
    setCounterPromptOpen(false);
    setCardMenu({
      x: e.clientX,
      y: e.clientY,
      instanceId: card.instanceId,
      name: card.name,
      zone,
      hasBack: !!card.backImageUrl,
    });
  }

  function closeCardMenu() {
    setCardMenu(null);
    setCounterPromptOpen(false);
  }

  // Zone-leaving actions clear the selection afterward (the cards are gone from the battlefield,
  // same as Windows losing your selection once the selected files are moved/deleted). Tap,
  // counters, and flips leave cards in place, so the selection stays live for further actions.
  const ZONE_LEAVING_ACTIONS = new Set(["dropCardOn", "moveCardToLibrary", "returnToHand"]);

  function cardMenuAction(type: string, payload: Record<string, unknown> = {}) {
    if (!cardMenu) return;
    const ids =
      selectedIds.size > 1 && selectedIds.has(cardMenu.instanceId)
        ? Array.from(selectedIds)
        : [cardMenu.instanceId];
    ids.forEach((instanceId) => sendAction(type, { instanceId, ...payload }));
    if (ids.length > 1 && ZONE_LEAVING_ACTIONS.has(type)) setSelectedIds(new Set());
    closeCardMenu();
  }

  function hoverProps(card: CardInstance) {
    return {
      onMouseEnter: () =>
        setHoverCard({ instanceId: card.instanceId, imageUrl: card.imageUrl, name: card.name }),
      onMouseLeave: () => setHoverCard(null),
    };
  }

  if (!room && playerId) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center sm:px-6">
        <p className="text-muted">Connecting to room {roomCode}...</p>
      </div>
    );
  }

  if (!joined) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
        <Link href="/play" className="text-xs text-muted underline hover:text-gold-bright">
          ← Back
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-foreground">
          Join {room ? room.name : `Room ${roomCode}`}{" "}
          <span className="text-gold-bright">({roomCode})</span>
        </h1>
        <label className="mt-6 mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
          Your Name (optional)
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Leave blank for a random planeswalker name"
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-gold focus:outline-none"
        />

        <label className="mt-4 mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
          Deck
        </label>
        <select
          value={selectedDeckId}
          onChange={(e) => setSelectedDeckId(e.target.value)}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-gold focus:outline-none"
        >
          <option value="">No deck (life counter only)</option>
          {decks.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} ({d.commanderName})
            </option>
          ))}
        </select>
        {decks.length === 0 && (
          <p className="mt-2 text-xs text-muted">
            Sign in and build a deck to bring cards into the game.
          </p>
        )}
        <p className="mt-2 text-xs text-muted">You&apos;ll start with a fresh 7-card hand.</p>

        {joinError && <p className="mt-3 text-xs text-red-600">{joinError}</p>}

        <button
          onClick={handleJoin}
          className="mt-6 w-full rounded-lg bg-gold px-4 py-3 text-sm font-semibold text-black hover:bg-gold-bright"
        >
          Join Game
        </button>
      </div>
    );
  }

  const me = room!.players[playerId!];
  const others = room!.joinOrder
    .filter((id) => id !== playerId)
    .map((id) => room!.players[id])
    .filter((p): p is PlayerState => !!p);
  const mySeatColor = playerId ? PLAYER_SEAT_COLORS[room!.joinOrder.indexOf(playerId)] : undefined;

  const layout = room!.maxPlayers <= 2 ? "halves" : "quadrants";
  // I'm always bottom-right (my header/command zone face up-and-left, toward the table center).
  // Everyone else fills the remaining seats in join order, each one's header/command zone facing
  // whichever corner of their box is closest to that same center point.
  const slots: (PlayerState | null)[] =
    layout === "halves"
      ? [others[0] ?? null, me]
      : [others[0] ?? null, others[1] ?? null, others[2] ?? null, me];
  const corners: Corner[] = layout === "halves" ? ["bl", "tl"] : ["br", "bl", "tr", "tl"];

  return (
    <div
      className="relative mx-auto flex h-[calc(100vh-57px)] max-w-[1600px] flex-col overflow-hidden bg-background px-3 py-3 sm:px-4"
    >
      <div className="mb-2 flex shrink-0 items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">
          {room!.name} <span className="text-gold-bright">({roomCode})</span>
        </h1>
        <div className="flex items-center gap-3">
          <p className="text-xs text-muted">
            {Object.keys(room!.players).length}/{room!.maxPlayers} players ·{" "}
            {room!.isOpen ? "Open session" : "Closed — code only"}
          </p>
        </div>
      </div>

      <div
        className={`relative grid min-h-0 flex-1 gap-3 ${
          layout === "halves" ? "grid-rows-2" : "grid-cols-2 grid-rows-2"
        }`}
      >
        {slots.map((player, i) => (
          <PlayerBox
            key={player?.id ?? `empty-${i}`}
            player={player}
            isMe={!!player && player.id === playerId}
            corner={corners[i]}
            boardRef={player?.id === playerId ? boardRef : undefined}
            dragging={dragging}
            startDrag={startDrag}
            onTap={(instanceId) => sendAction("tap", { instanceId })}
            onCounterDelta={(instanceId, delta) => sendAction("addCounters", { instanceId, delta })}
            onDraw={() => sendAction("pileDraw", { source: "library" })}
            onOpenPileMenu={openPileMenu}
            onOpenZoneViewer={(p, tab) => setZoneViewer({ playerId: p.id, tab })}
            onRevealedClick={(instanceId) => sendAction("revealedToHand", { instanceId })}
            onCardContextMenu={openCardMenu}
            hoverProps={hoverProps}
            zoneViewer={zoneViewer}
            zoneDrawerRef={zoneDrawerRef}
            setZoneViewer={setZoneViewer}
            startCrossDrag={startCrossDrag}
            viewerId={playerId!}
            shuffling={!!(player && shuffleFlash[player.id])}
            seatColor={player ? PLAYER_SEAT_COLORS[room!.joinOrder.indexOf(player.id)] : undefined}
            hoveredDropZone={hoveredDropZone}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onStartMarquee={startMarquee}
            onGroupTap={groupTap}
          />
        ))}
      </div>

      {/* Rubber-band selection rectangle — screen-fixed since the drag can range across the
          whole battlefield regardless of scroll. */}
      {marqueeRect && (
        <div
          className="pointer-events-none fixed z-[220] border border-blue-400 bg-blue-400/20"
          style={{
            left: Math.min(marqueeRect.x0, marqueeRect.x1),
            top: Math.min(marqueeRect.y0, marqueeRect.y1),
            width: Math.abs(marqueeRect.x1 - marqueeRect.x0),
            height: Math.abs(marqueeRect.y1 - marqueeRect.y0),
          }}
        />
      )}

      {me && (
        <div
          className="-mt-3 shrink-0 rounded-b-xl border border-t-0 border-border p-3 pt-4"
          style={mySeatColor ? { backgroundColor: mySeatColor } : undefined}
        >
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
              Hand ({me.hand.length})
            </h3>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <input
                  value={mulliganCount}
                  onChange={(e) => setMulliganCount(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="7"
                  className="w-10 rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-foreground placeholder:text-muted focus:border-gold focus:outline-none"
                />
                <button
                  onClick={() => {
                    const n = parseInt(mulliganCount, 10);
                    sendAction("mulligan", { handSize: Number.isFinite(n) && n > 0 ? n : 7 });
                  }}
                  className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground hover:border-gold"
                  title="Shuffles everything back into your library and draws a fresh hand — defaults to 7 if left blank"
                >
                  Mulligan
                </button>
              </div>
              <LifeWidget
                me={me}
                others={others}
                maxPlayers={room!.maxPlayers}
                sendAction={sendAction}
                showLifeMenu={showLifeMenu}
                setShowLifeMenu={setShowLifeMenu}
                showMoreCounters={showMoreCounters}
                setShowMoreCounters={setShowMoreCounters}
              />
              <div
                className="absolute right-0 top-16 bottom-0 z-40 flex items-center"
                ref={gameMenuRef}
              >
                <button
                  onClick={() => {
                    setShowGameMenu((s) => !s);
                    setGameMenuTab(null);
                  }}
                  className="rounded-l-md border border-r-0 border-border/60 bg-surface/40 px-2 py-3 text-xs text-foreground backdrop-blur-sm transition-colors hover:bg-surface/70 hover:border-gold [writing-mode:vertical-rl]"
                >
                  {showGameMenu ? "▸" : "◂"} Menu
                </button>
                {showGameMenu && (
                  <div className="absolute right-full top-1/2 z-40 mr-2 w-72 -translate-y-1/2 rounded-md border border-border/70 bg-surface/85 p-2 shadow-2xl backdrop-blur-md">
                    {gameMenuTab && (
                      <button
                        onClick={() => setGameMenuTab(null)}
                        className="mb-2 text-[11px] text-muted hover:text-gold-bright"
                      >
                        ← Back
                      </button>
                    )}
                    {!gameMenuTab && (
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => setGameMenuTab("dice")}
                          className="rounded px-2 py-1.5 text-left text-xs text-foreground hover:bg-surface-raised"
                        >
                          🎲 Dice &amp; Coins
                        </button>
                        <button
                          onClick={() => setGameMenuTab("hotkeys")}
                          className="rounded px-2 py-1.5 text-left text-xs text-foreground hover:bg-surface-raised"
                        >
                          ⌨ Hotkeys &amp; Cheat Sheet
                        </button>
                        <button
                          onClick={() => setGameMenuTab("save")}
                          className="rounded px-2 py-1.5 text-left text-xs text-foreground hover:bg-surface-raised"
                        >
                          💾 Save / Load Game
                        </button>
                        <button
                          onClick={() => {
                            setGameMenuTab("end");
                            setEndStage("confirm");
                          }}
                          className="rounded px-2 py-1.5 text-left text-xs text-foreground hover:bg-surface-raised"
                        >
                          🏁 End Game
                        </button>
                      </div>
                    )}

                    {gameMenuTab === "dice" && (
                      <div className="flex flex-col gap-2">
                        <div className="grid grid-cols-4 gap-1">
                          {DICE_KINDS.map((k) => (
                            <button
                              key={k}
                              onClick={() => setDiceKind(k)}
                              className={`rounded border px-2 py-1 text-xs ${
                                diceKind === k
                                  ? "border-gold bg-gold/10 text-gold-bright"
                                  : "border-border text-foreground hover:border-gold"
                              }`}
                            >
                              {DICE_LABEL[k]}
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-[11px] text-muted">Count</label>
                          <input
                            value={diceCount}
                            onChange={(e) => setDiceCount(e.target.value.replace(/[^0-9]/g, ""))}
                            className="w-16 rounded border border-border bg-surface px-2 py-1 text-xs text-foreground focus:border-gold focus:outline-none"
                          />
                        </div>
                        <button
                          onClick={() => {
                            const n = Math.max(1, Math.min(20, parseInt(diceCount, 10) || 1));
                            sendAction("rollDice", { kind: diceKind, count: n });
                            setShowGameMenu(false);
                            setGameMenuTab(null);
                          }}
                          className="rounded-md bg-gold px-3 py-1.5 text-xs font-semibold text-black hover:bg-gold-bright"
                        >
                          {diceKind === "coin" ? "Flip" : "Roll"}
                        </button>
                      </div>
                    )}

                    {gameMenuTab === "hotkeys" && (
                      <div className="flex flex-col gap-1">
                        {HOTKEYS.map((h) => (
                          <div key={h.key} className="flex items-center justify-between text-xs">
                            <span className="text-muted">{h.label}</span>
                            <kbd className="rounded border border-border bg-surface-raised px-1.5 py-0.5 font-mono text-[10px] text-foreground">
                              {h.key}
                            </kbd>
                          </div>
                        ))}
                      </div>
                    )}

                    {gameMenuTab === "save" && (
                      <div className="flex flex-col gap-2">
                        {room!.hostId !== playerId ? (
                          <p className="text-xs text-muted">Only the host can save or load the game.</p>
                        ) : (
                          <>
                            <button
                              onClick={async () => {
                                const res = await sendAction("saveGame");
                                if (res && !res.ok) {
                                  const data = await res.json().catch(() => ({}));
                                  alert(data.error ?? "Couldn't save the game.");
                                }
                                setShowGameMenu(false);
                                setGameMenuTab(null);
                              }}
                              className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground hover:border-gold"
                            >
                              Save Game {room!.hasSavedGame ? "(overwrite)" : ""}
                            </button>
                            <button
                              disabled={!room!.hasSavedGame}
                              onClick={async () => {
                                const res = await sendAction("loadGame");
                                if (res && !res.ok) {
                                  const data = await res.json().catch(() => ({}));
                                  alert(data.error ?? "Couldn't load the game.");
                                }
                                setShowGameMenu(false);
                                setGameMenuTab(null);
                              }}
                              className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground hover:border-gold disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Load Saved Game
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    {gameMenuTab === "end" && endStage === "confirm" && (
                      <div className="flex flex-col gap-2">
                        <p className="text-xs text-muted">
                          End the game? Everyone&apos;s hand, board, graveyard, and exile return to
                          their deck.
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setGameMenuTab(null);
                              setEndStage(null);
                              setShowGameMenu(false);
                            }}
                            className="flex-1 rounded-md border border-border px-3 py-1.5 text-xs text-foreground hover:border-gold"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              sendAction("endGame");
                              setEndStage("winner");
                            }}
                            className="flex-1 rounded-md bg-gold px-3 py-1.5 text-xs font-semibold text-black hover:bg-gold-bright"
                          >
                            End Game
                          </button>
                        </div>
                      </div>
                    )}

                    {gameMenuTab === "end" && endStage === "winner" && (
                      <div className="flex flex-col gap-2">
                        <p className="text-xs text-muted">Who won?</p>
                        <select
                          value={winnerChoice}
                          onChange={(e) => setWinnerChoice(e.target.value)}
                          className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-foreground focus:border-gold focus:outline-none"
                        >
                          <option value="">No winner declared</option>
                          {[me, ...others].map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => {
                            sendAction("recordGameResult", { winnerId: winnerChoice || null });
                            setEndStage("choice");
                          }}
                          className="rounded-md bg-gold px-3 py-1.5 text-xs font-semibold text-black hover:bg-gold-bright"
                        >
                          Continue
                        </button>
                      </div>
                    )}

                    {gameMenuTab === "end" && endStage === "choice" && (
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => {
                            sendAction("playAgain", { handSize: 7 });
                            setEndStage(null);
                            setGameMenuTab(null);
                            setShowGameMenu(false);
                          }}
                          className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground hover:border-gold"
                        >
                          Play Again
                        </button>
                        <button
                          onClick={() => setEndStage("newDeck")}
                          className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground hover:border-gold"
                        >
                          Select New Deck
                        </button>
                        <button
                          onClick={() => router.push("/play")}
                          className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground hover:border-gold"
                        >
                          Quit
                        </button>
                      </div>
                    )}

                    {gameMenuTab === "end" && endStage === "newDeck" && (
                      <div className="flex flex-col gap-2">
                        <select
                          value={newDeckId}
                          onChange={(e) => setNewDeckId(e.target.value)}
                          className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-foreground focus:border-gold focus:outline-none"
                        >
                          <option value="">Choose a deck...</option>
                          {decks.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name} ({d.commanderName})
                            </option>
                          ))}
                        </select>
                        <button
                          disabled={!newDeckId}
                          onClick={() => {
                            const deck = decks.find((d) => d.id === newDeckId);
                            if (!deck) return;
                            sendAction("selectNewDeck", {
                              deckCards: deck.cards,
                              cardBackUrl: deck.cardBackUrl ?? undefined,
                              commanderName: deck.commanderName,
                              commanderCard: deck.commanderCard,
                              tokenCards: deck.tokenCards,
                              extraCommandZoneCard: deck.partnerCommanderCard ?? deck.companionCard,
                              extraCommandZoneKind: deck.partnerCommanderCard ? "partner" : "companion",
                            });
                            setEndStage(null);
                            setGameMenuTab(null);
                            setShowGameMenu(false);
                            setNewDeckId("");
                          }}
                          className="rounded-md bg-gold px-3 py-1.5 text-xs font-semibold text-black hover:bg-gold-bright disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Confirm New Deck
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1" data-pile="hand">
            {me.hand.map((c) => (
              <div
                key={c.instanceId}
                onPointerDown={(e) => startCrossDrag(c.instanceId, "play", c, e)}
                onContextMenu={(e) => openCardMenu(e, c)}
                {...hoverProps(c)}
                className="w-28 shrink-0 cursor-grab touch-none select-none overflow-hidden rounded border border-border hover:border-gold"
                title={`Drag ${c.name} to the field, deck, graveyard, or exile — or click to play`}
              >
                {c.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.imageUrl} alt={c.name} className="w-full" draggable={false} />
                ) : (
                  <div className="flex h-40 items-center justify-center bg-surface-raised p-1 text-center text-xs text-muted">
                    {c.name}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {room!.log.length > 0 && (
        <div className="card-frame mt-2 shrink-0 overflow-hidden">
          <button
            onClick={() => setShowLog((s) => !s)}
            className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted hover:bg-surface-raised hover:text-foreground"
          >
            <span className="text-sm leading-none">{showLog ? "▾" : "▸"}</span>
            Log ({room!.log.length})
          </button>
          {showLog && (
            <div className="max-h-24 overflow-y-auto border-t border-border bg-surface p-2 text-xs text-muted">
              {room!.log
                .slice()
                .reverse()
                .map((l, i) => (
                  <p key={i}>{l}</p>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Drag ghost — follows the cursor for hand/graveyard/exile-origin drags. Battlefield-
          internal drags don't need this since the real card element already moves live. */}
      {ghost && (
        <div
          className="pointer-events-none fixed z-[250] w-28"
          style={{ left: ghost.x - 56, top: ghost.y - 78 }}
        >
          <div className="overflow-hidden rounded shadow-2xl ring-2 ring-gold" style={{ aspectRatio: "2.5 / 3.5" }}>
            {ghost.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ghost.imageUrl} alt={ghost.name} className="h-full w-full object-cover" draggable={false} />
            ) : (
              <div className="flex h-full items-center justify-center bg-surface-raised p-1 text-center text-[8px] text-muted">
                {ghost.name}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dice/coin roll banner — shown to every connected player. */}
      {activeRoll && (
        <div className="pointer-events-none fixed inset-x-0 top-1/3 z-[300] flex justify-center">
          <div
            className={`card-frame flex flex-col items-center gap-1 px-6 py-4 shadow-2xl ${
              rollAnimating ? "animate-pop-in" : ""
            }`}
          >
            <p className="text-xs uppercase tracking-wide text-muted">
              {activeRoll.playerName} {activeRoll.kind === "coin" ? "flipped" : `rolled ${activeRoll.kind}`}
            </p>
            <p
              className={`text-3xl font-bold text-gold-bright ${rollAnimating ? "animate-spin-slow" : ""}`}
            >
              {rollAnimating ? DICE_ICON[activeRoll.kind] : activeRoll.results.join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Alert banner — shown to every connected player. */}
      {activeAlert && (
        <div className="pointer-events-none fixed inset-x-0 top-1/4 z-[300] flex justify-center">
          <div className="card-frame animate-pop-in border-2 border-gold bg-gold/10 px-8 py-3 shadow-2xl">
            <p className="text-2xl font-black uppercase tracking-widest text-gold-bright">
              📯 Alert! — {activeAlert.byName}
            </p>
          </div>
        </div>
      )}

      {/* Token summoning window — the deck's Token-category cards, click one to place a fresh
          copy on your own battlefield. Tokens are unlimited, so nothing is removed from here. */}
      {showTokens && (
        <div
          ref={tokensRef}
          className="card-frame fixed bottom-4 right-4 z-[280] w-72 max-h-[60vh] overflow-y-auto p-3 shadow-2xl"
        >
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
              Tokens ({me.tokenCards.length})
            </h3>
            <button
              onClick={() => setShowTokens(false)}
              className="text-xs text-muted hover:text-gold-bright"
            >
              ✕
            </button>
          </div>
          {me.tokenCards.length === 0 ? (
            <p className="text-xs text-muted">This deck has no token cards.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {me.tokenCards.map((t) => (
                <div
                  key={t.scryfallId}
                  onPointerDown={(e) => startTokenDrag(t.scryfallId, t.name, t.imageUrl, e)}
                  title={`Drag ${t.name} onto the field, or click to summon at a random spot`}
                  className="cursor-grab touch-none select-none overflow-hidden rounded border border-border hover:border-gold"
                >
                  {t.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.imageUrl} alt={t.name} className="w-full" draggable={false} />
                  ) : (
                    <div className="flex h-20 items-center justify-center bg-surface-raised p-1 text-center text-[8px] text-muted">
                      {t.name}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Hover preview — fixed panel, decoupled from card position so it never overlaps or
          interferes with the tap/untap click target underneath it. */}
      {hoverCard && !ghost && (
        <div className="pointer-events-none fixed right-4 top-20 z-[200] w-64">
          {hoverCard.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={hoverCard.imageUrl}
              alt={hoverCard.name}
              className="w-full rounded-lg shadow-2xl"
              draggable={false}
            />
          ) : (
            <div className="card-frame p-4 text-center text-sm text-foreground shadow-2xl">
              {hoverCard.name}
            </div>
          )}
        </div>
      )}

      {pileMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={closePileMenu}
            onContextMenu={(e) => {
              e.preventDefault();
              closePileMenu();
            }}
          />
          <div
            className="card-frame fixed z-50 w-52 p-1 text-sm shadow-2xl"
            style={{ left: pileMenu.x, top: pileMenu.y }}
          >
            {promptFor === null ? (
              <div className="flex flex-col">
                <MenuBtn onClick={() => pileMenuAction("pileDraw")}>Draw Card</MenuBtn>
                <MenuBtn onClick={() => pileMenuAction("pileToZone", { dest: "battlefield" })}>
                  Field
                </MenuBtn>
                <MenuBtn onClick={() => pileMenuAction("pileToZone", { dest: "graveyard" })}>
                  Graveyard
                </MenuBtn>
                <MenuBtn onClick={() => pileMenuAction("pileToZone", { dest: "exile" })}>
                  Exile
                </MenuBtn>
                <MenuBtn
                  onClick={() => {
                    sendAction("shuffle");
                    closePileMenu();
                  }}
                >
                  Shuffle
                </MenuBtn>
                <MenuBtn
                  onClick={() => {
                    setShowSearch(pileMenu.source);
                    closePileMenu();
                  }}
                >
                  Search {zoneName(pileMenu.source)}
                </MenuBtn>
                <MenuBtn onClick={() => pileMenuAction("pileRevealTop")}>Reveal Top</MenuBtn>
                <MenuBtn
                  onClick={() => {
                    setPromptFor("scry");
                    setPromptValue("1");
                  }}
                >
                  Scry X...
                </MenuBtn>
                <MenuBtn
                  onClick={() => {
                    setPromptFor("drawX");
                    setPromptValue("1");
                  }}
                >
                  Draw X...
                </MenuBtn>
              </div>
            ) : (
              <div className="flex flex-col gap-2 p-2">
                <label className="text-xs text-muted">
                  {promptFor === "scry" ? "Scry how many?" : "Draw how many?"}
                </label>
                <input
                  type="number"
                  min={1}
                  max={promptFor === "scry" ? 20 : 50}
                  value={promptValue}
                  onChange={(e) => setPromptValue(e.target.value)}
                  autoFocus
                  className="rounded border border-border bg-surface px-2 py-1 text-sm text-foreground focus:border-gold focus:outline-none"
                />
                <button
                  className="rounded bg-gold px-2 py-1.5 text-xs font-semibold text-black hover:bg-gold-bright"
                  onClick={() => {
                    const n = Math.max(1, parseInt(promptValue, 10) || 1);
                    pileMenuAction(promptFor === "scry" ? "pileScry" : "pileDrawMultiple", {
                      count: n,
                    });
                  }}
                >
                  Go
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {cardMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={closeCardMenu} />
          <div
            className="card-frame fixed z-50 w-48 p-1 text-sm shadow-2xl"
            style={{ left: cardMenu.x, top: cardMenu.y }}
          >
            {!counterPromptOpen ? (
              <>
                {cardMenu.zone !== "graveyard" &&
                  cardMenu.zone !== "exile" &&
                  cardMenu.zone !== "commandZone" &&
                  cardMenu.zone !== "library" && (
                    <>
                      <MenuBtn onClick={() => cardMenuAction("setCardTapped", { tapped: true })}>Tap</MenuBtn>
                      <MenuBtn onClick={() => cardMenuAction("setCardTapped", { tapped: false })}>Untap</MenuBtn>
                    </>
                  )}
                {cardMenu.zone !== "library" && (
                  <>
                    <MenuBtn onClick={() => cardMenuAction("moveCardToLibrary", { position: "top" })}>
                      Move to Top of Deck
                    </MenuBtn>
                    <MenuBtn onClick={() => cardMenuAction("moveCardToLibrary", { position: "bottom" })}>
                      Move to Bottom of Deck
                    </MenuBtn>
                  </>
                )}
                {(cardMenu.zone === "graveyard" || cardMenu.zone === "commandZone" || cardMenu.zone === "library") && (
                  <MenuBtn onClick={() => cardMenuAction("dropCardOn", { dest: "exile" })}>Exile</MenuBtn>
                )}
                {(cardMenu.zone === "exile" || cardMenu.zone === "commandZone" || cardMenu.zone === "library") && (
                  <MenuBtn onClick={() => cardMenuAction("dropCardOn", { dest: "graveyard" })}>Graveyard</MenuBtn>
                )}
                {(cardMenu.zone === "graveyard" ||
                  cardMenu.zone === "exile" ||
                  cardMenu.zone === "commandZone" ||
                  cardMenu.zone === "library") && (
                  <MenuBtn onClick={() => cardMenuAction("dropCardOn", { dest: "battlefield" })}>Play</MenuBtn>
                )}
                {cardMenu.zone === "battlefield" && (
                  <MenuBtn onClick={() => cardMenuAction("returnToHand")}>Return to Hand</MenuBtn>
                )}
                {(cardMenu.zone === "battlefield" ||
                  cardMenu.zone === "graveyard" ||
                  cardMenu.zone === "exile") && (
                  <MenuBtn onClick={() => cardMenuAction("dropCardOn", { dest: "commandZone" })}>
                    Move to Command Zone
                  </MenuBtn>
                )}
                {cardMenu.hasBack && (
                  <MenuBtn onClick={() => cardMenuAction("flipCard")}>Flip Card</MenuBtn>
                )}
                <MenuBtn
                  onClick={() => {
                    setCounterPromptValue("1");
                    setCounterPromptOpen(true);
                  }}
                >
                  Add Counters...
                </MenuBtn>
              </>
            ) : (
              <div className="flex flex-col gap-2 p-2">
                <label className="text-xs text-muted">
                  Add how many +1/+1 counters? (negative to remove)
                </label>
                <input
                  type="number"
                  value={counterPromptValue}
                  onChange={(e) => setCounterPromptValue(e.target.value)}
                  autoFocus
                  className="rounded border border-border bg-surface px-2 py-1 text-sm text-foreground focus:border-gold focus:outline-none"
                />
                <button
                  className="rounded bg-gold px-2 py-1.5 text-xs font-semibold text-black hover:bg-gold-bright"
                  onClick={() => {
                    const n = parseInt(counterPromptValue, 10) || 0;
                    cardMenuAction("addCounters", { delta: n });
                  }}
                >
                  Apply
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {showSearch && me && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowSearch(null)}
        >
          <div
            className="card-frame max-h-[80vh] w-full max-w-2xl overflow-y-auto p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                Search Your {zoneName(showSearch)} ({me[showSearch].length})
              </h3>
              <button onClick={() => setShowSearch(null)} className="text-sm text-muted hover:text-foreground">
                ✕
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {[...me[showSearch]]
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((c) => (
                  <div key={c.instanceId} {...hoverProps(c)}>
                    <div
                      onPointerDown={(e) => {
                        // Close immediately (not just on drop) so the board underneath is
                        // visible and reachable for the rest of the drag.
                        startCrossDrag(c.instanceId, "toHand", c, e, showSearch);
                        setShowSearch(null);
                      }}
                      onContextMenu={(e) => openCardMenu(e, c, showSearch)}
                      title={`Drag ${c.name} to the field, or click to take it into hand`}
                      className="flex w-full cursor-grab touch-none select-none flex-col gap-1 rounded border border-border p-1 text-left hover:border-gold"
                    >
                      <div className="overflow-hidden rounded" style={{ aspectRatio: "2.5 / 3.5" }}>
                        {c.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={c.imageUrl}
                            alt={c.name}
                            className="h-full w-full object-cover"
                            draggable={false}
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center bg-surface-raised p-1 text-center text-[8px] text-muted">
                            {c.name}
                          </div>
                        )}
                      </div>
                      <p className="line-clamp-1 text-[9px] text-foreground">{c.name}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {me && me.scrying.length > 0 && (
        <div className="card-frame fixed bottom-4 right-4 z-50 w-64 p-3 shadow-2xl">
          <h4 className="mb-2 text-xs font-semibold text-gold-bright">Scrying ({me.scrying.length})</h4>
          <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
            {me.scrying.map((c) => (
              <div key={c.instanceId} className="flex items-center gap-2 rounded border border-border p-1.5" {...hoverProps(c)}>
                <div className="w-10 shrink-0 overflow-hidden rounded" style={{ aspectRatio: "2.5 / 3.5" }}>
                  {c.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.imageUrl} alt={c.name} className="h-full w-full object-cover" draggable={false} />
                  ) : null}
                </div>
                <span className="flex-1 truncate text-xs text-foreground">{c.name}</span>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => sendAction("scryResolve", { instanceId: c.instanceId, toBottom: false })}
                    className="rounded border border-border px-1.5 py-0.5 text-[9px] hover:border-gold"
                  >
                    Top
                  </button>
                  <button
                    onClick={() => sendAction("scryResolve", { instanceId: c.instanceId, toBottom: true })}
                    className="rounded border border-border px-1.5 py-0.5 text-[9px] hover:border-gold"
                  >
                    Bottom
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MenuBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button className="rounded px-3 py-1.5 text-left hover:bg-surface-raised" onClick={onClick}>
      {children}
    </button>
  );
}

function LifeWidget({
  me,
  others,
  maxPlayers,
  sendAction,
  showLifeMenu,
  setShowLifeMenu,
  showMoreCounters,
  setShowMoreCounters,
}: {
  me: PlayerState;
  others: PlayerState[];
  maxPlayers: number;
  sendAction: (type: string, payload?: Record<string, unknown>) => void;
  showLifeMenu: boolean;
  setShowLifeMenu: (fn: (s: boolean) => boolean) => void;
  showMoreCounters: boolean;
  setShowMoreCounters: (fn: (s: boolean) => boolean) => void;
}) {
  // Commander damage slots track the room's capacity, not just who has joined so far — pick a
  // 4-player room and you get 3 rows immediately, each auto-filling with a name and commander
  // the moment that seat is taken.
  const opponentSlotCount = Math.max(0, maxPlayers - 1);
  const emptySlots = Math.max(0, opponentSlotCount - others.length);
  return (
    <div className="relative">
      <button
        onClick={() => setShowLifeMenu((s) => !s)}
        className="flex items-center gap-1.5 rounded-full border-2 border-gold bg-surface px-3 py-1.5 shadow hover:bg-surface-raised"
      >
        <span className="text-xl">❤</span>
        <span className="text-xl font-bold text-gold-bright">{me.life}</span>
      </button>

      {showLifeMenu && (
        <div className="card-frame absolute bottom-full right-0 z-50 mb-2 w-64 p-3 shadow-2xl">
          <div className="grid grid-cols-4 gap-1.5">
            <button
              onClick={() => sendAction("life", { delta: -10 })}
              className="rounded border border-border py-1.5 text-xs font-semibold hover:border-gold"
            >
              −10
            </button>
            <button
              onClick={() => sendAction("life", { delta: -1 })}
              className="rounded border border-border py-1.5 text-xs font-semibold hover:border-gold"
            >
              −1
            </button>
            <button
              onClick={() => sendAction("life", { delta: 1 })}
              className="rounded border border-border py-1.5 text-xs font-semibold hover:border-gold"
            >
              +1
            </button>
            <button
              onClick={() => sendAction("life", { delta: 10 })}
              className="rounded border border-border py-1.5 text-xs font-semibold hover:border-gold"
            >
              +10
            </button>
          </div>

          <button
            onClick={() => setShowMoreCounters((s) => !s)}
            className="mt-2 w-full text-left text-xs text-muted hover:text-foreground"
          >
            {showMoreCounters ? "▾" : "▸"} More (poison, infect, commander damage)
          </button>

          {showMoreCounters && (
            <div className="mt-2 flex flex-col gap-2 border-t border-border pt-2">
              <CounterRow
                label="Poison"
                value={me.poison}
                onDelta={(d) => sendAction("counter", { counter: "poison", delta: d })}
              />
              <CounterRow
                label="Infect"
                value={me.infect}
                onDelta={(d) => sendAction("counter", { counter: "infect", delta: d })}
              />
              {opponentSlotCount > 0 && (
                <>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
                    Commander Damage Taken ({opponentSlotCount})
                  </p>
                  {others.flatMap((p) => {
                    // One counter per commander — a partner pair deals damage separately, each
                    // toward its own 21. A companion in the zone isn't a commander, so no row.
                    const commanderSlotIds = (p.slotKinds ?? [])
                      .map((kind, slot) => (kind === "commander" ? slot : -1))
                      .filter((slot) => slot >= 0);
                    if (commanderSlotIds.length <= 1) {
                      return [
                        <CounterRow
                          key={p.id}
                          label={p.commanderName ? `${p.name} — ${p.commanderName}` : p.name}
                          value={me.commanderDamage[p.id] ?? 0}
                          onDelta={(d) => sendAction("commanderDamage", { fromPlayerId: p.id, delta: d })}
                        />,
                      ];
                    }
                    return commanderSlotIds.map((slot) => (
                      <CounterRow
                        key={`${p.id}:${slot}`}
                        label={`${p.name} — ${p.slotNames?.[slot] ?? `Commander ${slot + 1}`}`}
                        value={me.commanderDamage[slot > 0 ? `${p.id}:${slot}` : p.id] ?? 0}
                        onDelta={(d) =>
                          sendAction("commanderDamage", { fromPlayerId: p.id, delta: d, slot })
                        }
                      />
                    ));
                  })}
                  {Array.from({ length: emptySlots }, (_, i) => (
                    <CounterRow key={`empty-${i}`} label="Waiting for player..." value={0} disabled />
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CounterRow({
  label,
  value,
  onDelta,
  disabled,
}: {
  label: string;
  value: number;
  onDelta?: (delta: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-2 ${disabled ? "opacity-40" : ""}`}>
      <span className="truncate text-xs text-foreground" title={label}>
        {label}
      </span>
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          onClick={() => onDelta?.(-1)}
          disabled={disabled}
          className="rounded border border-border px-1.5 text-xs text-muted hover:text-foreground"
        >
          −
        </button>
        <span className="w-5 text-center text-xs font-semibold text-gold-bright">{value}</span>
        <button
          onClick={() => onDelta?.(1)}
          disabled={disabled}
          className="rounded border border-border px-1.5 text-xs text-muted hover:text-foreground"
        >
          +
        </button>
      </div>
    </div>
  );
}

function PileTile({
  label,
  topCard,
  count,
  isBack,
  cardBackUrl,
  dropZone,
  onClick,
  onContextMenu,
  animating,
  active,
}: {
  label: string;
  topCard?: CardInstance;
  count: number;
  isBack?: boolean;
  cardBackUrl?: string | null;
  dropZone?: DropDest;
  onClick?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  animating?: boolean;
  active?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 p-1.5 -m-1.5" data-pile={dropZone}>
      <button
        onClick={onClick}
        onContextMenu={onContextMenu}
        disabled={!onClick}
        className={`w-16 origin-bottom transition-transform duration-200 ${
          onClick ? "cursor-pointer" : "cursor-default"
        } ${animating ? "animate-shuffle" : ""} ${active ? "scale-125" : "scale-100"}`}
        title={onContextMenu ? `Click to view · Right-click for ${label} options` : undefined}
      >
        {isBack ? (
          <CardBack value={cardBackUrl} className="w-full" />
        ) : (
          <div
            className="overflow-hidden rounded-md border-2 border-border"
            style={{ aspectRatio: "2.5 / 3.5" }}
          >
            {topCard?.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={topCard.imageUrl}
                alt={topCard.name}
                className="h-full w-full object-cover"
                draggable={false}
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-surface-raised text-[8px] text-muted">
                {label}
              </div>
            )}
          </div>
        )}
      </button>
      <span className="text-[9px] text-muted">{count}</span>
    </div>
  );
}

function ZoneDrawer({
  player,
  tab,
  isOwner,
  drawerRef,
  onTabChange,
  onClose,
  hoverProps,
  onCardContextMenu,
  startCrossDrag,
}: {
  player: PlayerState;
  tab: ZoneTab;
  isOwner: boolean;
  drawerRef: React.RefObject<HTMLDivElement | null>;
  onTabChange: (tab: ZoneTab) => void;
  onClose: () => void;
  hoverProps: (card: CardInstance) => { onMouseEnter: () => void; onMouseLeave: () => void };
  onCardContextMenu: (e: React.MouseEvent, card: CardInstance, zone?: CardMenuZone) => void;
  startCrossDrag: (
    instanceId: string,
    quickAction: "play" | "toHand" | null,
    card: CardInstance,
    e: React.PointerEvent,
    searchSource?: PileZone
  ) => void;
}) {
  const cards = player[tab];
  return (
    <div
      ref={drawerRef}
      className="card-frame absolute inset-x-0 bottom-0 z-30 flex flex-col overflow-hidden"
      style={{ height: "42%" }}
    >
      <div className="flex items-center justify-between border-b border-border p-1.5">
        <div className="flex gap-1.5">
          <button
            onClick={() => onTabChange("graveyard")}
            className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
              tab === "graveyard" ? "bg-gold text-black" : "border border-border text-muted hover:border-gold"
            }`}
          >
            Graveyard ({player.graveyard.length})
          </button>
          <button
            onClick={() => onTabChange("exile")}
            className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
              tab === "exile" ? "bg-gold text-black" : "border border-border text-muted hover:border-gold"
            }`}
          >
            Exile ({player.exile.length})
          </button>
        </div>
        <button onClick={onClose} className="text-sm text-muted hover:text-foreground">
          ✕
        </button>
      </div>
      <div className="flex-1 overflow-hidden p-1.5">
        <div className="flex flex-wrap gap-1">
          {cards.map((c) => (
            <div
              key={c.instanceId}
              {...hoverProps(c)}
              onPointerDown={isOwner ? (e) => startCrossDrag(c.instanceId, null, c, e) : undefined}
              onContextMenu={isOwner ? (e) => onCardContextMenu(e, c, tab) : undefined}
              className={`w-16 shrink-0 overflow-hidden rounded border border-border ${isOwner ? "cursor-grab touch-none" : ""}`}
              style={{ aspectRatio: "2.5 / 3.5" }}
            >
              {c.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.imageUrl} alt={c.name} className="h-full w-full object-cover" draggable={false} />
              ) : (
                <div className="flex h-full items-center justify-center bg-surface-raised p-1 text-center text-[8px] text-muted">
                  {c.name}
                </div>
              )}
            </div>
          ))}
          {cards.length === 0 && <p className="col-span-full text-xs text-muted">Empty.</p>}
        </div>
      </div>
    </div>
  );
}

function PlayerBox({
  player,
  isMe,
  corner,
  boardRef,
  dragging,
  startDrag,
  onTap,
  onCounterDelta,
  onDraw,
  onOpenPileMenu,
  onOpenZoneViewer,
  onRevealedClick,
  onCardContextMenu,
  hoverProps,
  zoneViewer,
  zoneDrawerRef,
  setZoneViewer,
  startCrossDrag,
  viewerId,
  shuffling,
  seatColor,
  hoveredDropZone,
  selectedIds,
  onToggleSelect,
  onStartMarquee,
  onGroupTap,
}: {
  player: PlayerState | null;
  isMe: boolean;
  corner: Corner;
  boardRef?: React.RefObject<HTMLDivElement | null>;
  dragging: { instanceId: string; x: number; y: number } | null;
  startDrag: (card: CardInstance, e: React.PointerEvent) => void;
  onTap: (instanceId: string) => void;
  onCounterDelta: (instanceId: string, delta: number) => void;
  onDraw: () => void;
  onOpenPileMenu: (e: React.MouseEvent, source: PileZone) => void;
  onOpenZoneViewer: (player: PlayerState, tab: ZoneTab) => void;
  onRevealedClick: (instanceId: string) => void;
  onCardContextMenu: (e: React.MouseEvent, card: CardInstance, zone?: CardMenuZone) => void;
  hoverProps: (card: CardInstance) => { onMouseEnter: () => void; onMouseLeave: () => void };
  zoneViewer: ZoneViewerState | null;
  zoneDrawerRef: React.RefObject<HTMLDivElement | null>;
  setZoneViewer: (fn: (z: ZoneViewerState | null) => ZoneViewerState | null) => void;
  startCrossDrag: (
    instanceId: string,
    quickAction: "play" | "toHand" | null,
    card: CardInstance,
    e: React.PointerEvent,
    searchSource?: PileZone
  ) => void;
  viewerId: string;
  shuffling?: boolean;
  seatColor?: string;
  hoveredDropZone?: string | null;
  selectedIds: Set<string>;
  onToggleSelect: (instanceId: string) => void;
  onStartMarquee: (e: React.PointerEvent) => void;
  onGroupTap: (tapped: boolean) => void;
}) {
  if (!player) {
    return (
      <div className="card-frame flex items-center justify-center text-xs text-muted/50">
        Open seat
      </div>
    );
  }

  const gyTop = player.graveyard[player.graveyard.length - 1];
  const exTop = player.exile[player.exile.length - 1];
  const drawerOpen = zoneViewer?.playerId === player.id;

  // Every player sees their own board in the bottom-right; every other seat's header + command
  // zone sit at whichever corner faces the shared center point, so names/life read outward from
  // the middle of the table no matter where that player actually landed in the grid.
  const atTop = corner[0] === "t";
  const atLeft = corner[1] === "l";
  const headerOrder = atTop ? 0 : 2;

  // One square per commander (two with a partner). A commander sits in the square it started in
  // even after another one leaves the zone, so casting one doesn't slide the other over; any
  // card without a remembered square (e.g. sent here from the menu) takes the first free one.
  const slotCount = Math.max(1, player.commanderSlots ?? 0, player.commandZone.length);
  const commandSlots: (CardInstance | null)[] = Array.from({ length: slotCount }, () => null);
  const unplaced: CardInstance[] = [];
  for (const c of player.commandZone) {
    const s = c.commandSlot;
    if (s !== undefined && s < slotCount && !commandSlots[s]) commandSlots[s] = c;
    else unplaced.push(c);
  }
  for (const c of unplaced) {
    const free = commandSlots.indexOf(null);
    if (free !== -1) commandSlots[free] = c;
  }

  return (
    <div
      className="card-frame relative flex flex-col overflow-hidden p-2"
      style={seatColor ? { backgroundColor: seatColor } : undefined}
    >
      <div
        style={{ order: headerOrder }}
        className={`mb-1 flex items-center gap-2 ${atLeft ? "justify-start" : "flex-row-reverse justify-start"}`}
      >
        <span key={player.id} className="animate-pop-in flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-semibold text-foreground">
            {player.name}
            {isMe ? " (you)" : ""}
          </span>
          <span className="shrink-0 text-sm font-bold text-gold-bright">❤ {player.life}</span>
        </span>
        {!isMe && <span className="shrink-0 text-[10px] text-muted">{player.hand.length} in hand</span>}
        <span className="shrink-0 rounded border border-border px-1 text-[9px] text-muted" title="Wins-Losses">
          {player.wins}-{player.losses}
        </span>
      </div>

      <div
        style={{ order: headerOrder }}
        className={`mb-1 flex items-center gap-1.5 ${atLeft ? "justify-start" : "flex-row-reverse justify-start"}`}
        data-pile={isMe ? "commandZone" : undefined}
      >
        {commandSlots.map((c, i) => (
          <div key={`slot-${i}`} className="flex shrink-0 flex-col items-center gap-0.5">
            {c ? (
              <div
                {...hoverProps(c)}
                onPointerDown={isMe ? (e) => startCrossDrag(c.instanceId, null, c, e) : undefined}
                onContextMenu={isMe ? (e) => onCardContextMenu(e, c, "commandZone") : undefined}
                className={`w-16 shrink-0 overflow-hidden rounded border-2 border-gold ${isMe ? "cursor-grab touch-none" : ""}`}
                style={{ aspectRatio: "2.5 / 3.5" }}
                title={c.name}
              >
                {c.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.imageUrl} alt={c.name} className="h-full w-full object-cover" draggable={false} />
                ) : null}
              </div>
            ) : (
              <div
                className="flex w-16 shrink-0 items-center justify-center rounded border border-dashed border-border text-[9px] text-muted"
                style={{ aspectRatio: "2.5 / 3.5" }}
              >
                CMD
              </div>
            )}
            {/* Partners each owe their own tax, shown under their own square. */}
            {commandSlots.length > 1 && player.slotKinds?.[i] !== "companion" && (
              <span className="text-[10px] text-muted">Tax: {player.commanderTaxes?.[i] ?? 0}</span>
            )}
          </div>
        ))}
        {commandSlots.length === 1 && (
          <span className="text-xs text-muted">Tax: {player.commanderTax}</span>
        )}
      </div>

      <div
        ref={boardRef}
        onPointerDown={isMe ? onStartMarquee : undefined}
        className="relative order-1 flex-1 overflow-hidden rounded border border-border bg-surface"
      >
        {player.battlefield.map((c) => (
          <BattlefieldCard
            key={c.instanceId}
            card={c}
            readOnly={!isMe}
            isDragging={
              isMe &&
              (dragging?.instanceId === c.instanceId ||
                (!!dragging &&
                  selectedIds.size > 1 &&
                  selectedIds.has(dragging.instanceId) &&
                  selectedIds.has(c.instanceId)))
            }
            selected={isMe && selectedIds.has(c.instanceId)}
            onPointerDown={isMe ? (e) => startDrag(c, e) : undefined}
            onTap={
              isMe
                ? (e) => {
                    if (e.shiftKey) onToggleSelect(c.instanceId);
                    else if (selectedIds.size > 1 && selectedIds.has(c.instanceId)) onGroupTap(!c.tapped);
                    else onTap(c.instanceId);
                  }
                : undefined
            }
            onContextMenu={isMe ? (e) => onCardContextMenu(e, c, "battlefield") : undefined}
            onCounterDelta={isMe ? (delta) => onCounterDelta(c.instanceId, delta) : undefined}
            hoverProps={hoverProps(c)}
          />
        ))}

        {player.revealed.length > 0 && (
          <div className="absolute left-1 top-1 flex gap-1">
            {player.revealed.map((c) => (
              <button
                key={c.instanceId}
                onClick={isMe ? () => onRevealedClick(c.instanceId) : undefined}
                onContextMenu={isMe ? (e) => onCardContextMenu(e, c) : undefined}
                {...hoverProps(c)}
                className={`w-16 ${isMe ? "cursor-pointer" : "cursor-default"}`}
                title={isMe ? "Click to take into hand" : c.name}
              >
                <div
                  className="overflow-hidden rounded border-2 border-gold"
                  style={{ aspectRatio: "2.5 / 3.5" }}
                >
                  {c.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.imageUrl} alt={c.name} className="h-full w-full object-cover" draggable={false} />
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Exile/Graveyard sit in the true corner with Deck next to them. The header/command
            zone hug the corner facing the table center (atTop/atLeft) — piles go in the
            opposite corner, so they anchor to the flipped edge on both axes. flex-row-reverse
            swaps which side Deck vs. EX/GY land on without touching DOM/tab order. */}
        <div
          className={`absolute z-20 flex gap-3 ${atTop ? "bottom-1 items-end" : "top-1 items-start"} ${
            atLeft ? "right-1" : "left-1 flex-row-reverse"
          }`}
        >
          <PileTile
            label="Deck"
            count={player.library.length}
            isBack
            cardBackUrl={player.cardBackUrl}
            dropZone={isMe ? "library-top" : undefined}
            onClick={isMe ? onDraw : undefined}
            onContextMenu={isMe ? (e) => onOpenPileMenu(e, "library") : undefined}
            animating={shuffling}
            active={isMe && hoveredDropZone === "library-top"}
          />
          {/* Graveyard always sits nearest Deck — when items-start flips Deck to the top of the
              row, flex-col-reverse flips GY to the top of this column to match. */}
          <div className={`flex gap-3 ${atTop ? "flex-col" : "flex-col-reverse"}`}>
            <PileTile
              label="EX"
              topCard={exTop}
              count={player.exile.length}
              dropZone={isMe ? "exile" : undefined}
              onClick={() => onOpenZoneViewer(player, "exile")}
              active={isMe && hoveredDropZone === "exile"}
            />
            <PileTile
              label="GY"
              topCard={gyTop}
              count={player.graveyard.length}
              dropZone={isMe ? "graveyard" : undefined}
              onClick={() => onOpenZoneViewer(player, "graveyard")}
              active={isMe && hoveredDropZone === "graveyard"}
            />
          </div>
        </div>

        {drawerOpen && zoneViewer && (
          <ZoneDrawer
            player={player}
            tab={zoneViewer.tab}
            isOwner={player.id === viewerId}
            drawerRef={zoneDrawerRef}
            onTabChange={(tab) => setZoneViewer((z) => (z ? { ...z, tab } : z))}
            onClose={() => setZoneViewer(() => null)}
            hoverProps={hoverProps}
            onCardContextMenu={onCardContextMenu}
            startCrossDrag={startCrossDrag}
          />
        )}
      </div>
    </div>
  );
}

function BattlefieldCard({
  card,
  readOnly,
  isDragging,
  selected,
  onPointerDown,
  onTap,
  onContextMenu,
  onCounterDelta,
  hoverProps,
}: {
  card: CardInstance;
  readOnly?: boolean;
  isDragging?: boolean;
  selected?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
  onTap?: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  onCounterDelta?: (delta: number) => void;
  hoverProps: { onMouseEnter: () => void; onMouseLeave: () => void };
}) {
  const shownImage = card.facingBack && card.backImageUrl ? card.backImageUrl : card.imageUrl;
  const showCounterRow = card.counters !== 0;

  return (
    <div
      data-instance-id={card.instanceId}
      className={`absolute z-30 w-16 ${isDragging ? "opacity-30" : ""}`}
      style={{
        left: `${card.x}%`,
        top: `${card.y}%`,
      }}
      {...hoverProps}
    >
      <div
        onPointerDown={readOnly ? undefined : onPointerDown}
        onClick={readOnly ? undefined : onTap}
        onContextMenu={onContextMenu}
        className={`cursor-grab touch-none select-none rounded transition-transform ${
          selected ? "ring-2 ring-blue-400 ring-offset-1 ring-offset-surface" : ""
        }`}
        style={{ transform: card.tapped ? "rotate(90deg)" : undefined }}
        title={
          readOnly
            ? card.name
            : `${card.name} — click to tap, shift-click to select, right-click for options`
        }
      >
        {shownImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shownImage} alt={card.name} className="w-full rounded shadow-lg" draggable={false} />
        ) : (
          <div
            className="flex w-16 items-center justify-center rounded bg-surface-raised p-1 text-center text-[8px] text-muted"
            style={{ aspectRatio: "2.5 / 3.5" }}
          >
            {card.name}
          </div>
        )}
      </div>
      {card.isCopy && (
        <div className="pointer-events-none absolute left-0 top-0 rounded-br rounded-tl bg-gold px-1 py-0.5 text-[8px] font-bold leading-none text-black">
          COPY
        </div>
      )}
      {/* Sits outside the rotating div so it never spins with a tapped card — pinned to the
          bottom edge of the card's own (unrotated) footprint, like a counter chip on the card. */}
      {showCounterRow && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 rounded-b bg-black/75 px-1 py-0.5 text-[9px] leading-none text-white">
          {!readOnly && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCounterDelta?.(-1);
              }}
              className="pointer-events-auto px-0.5 hover:text-gold-bright"
            >
              −
            </button>
          )}
          <span>
            {card.counters > 0
              ? `+${card.counters}/+${card.counters}`
              : `${card.counters}/${card.counters}`}
          </span>
          {!readOnly && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCounterDelta?.(1);
              }}
              className="pointer-events-auto px-0.5 hover:text-gold-bright"
            >
              +
            </button>
          )}
        </div>
      )}
    </div>
  );
}
