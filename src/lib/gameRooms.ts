import { EventEmitter } from "node:events";

export interface CardInstance {
  instanceId: string;
  scryfallId: string;
  name: string;
  imageUrl?: string;
  backImageUrl?: string;
  facingBack?: boolean;
  counters: number; // net +1/+1-style counters
  tapped: boolean;
  x: number;
  y: number;
  isToken?: boolean; // ceases to exist rather than landing in the graveyard/exile
  isCopy?: boolean; // same rule as tokens — a copy ceases to exist outside the battlefield
  commandSlot?: number; // which command-zone square this commander belongs to (survives leaving the zone)
}

export type PileZone = "library" | "graveyard" | "exile";
export type CardZone = "battlefield" | "hand" | PileZone | "revealed" | "scrying" | "commandZone";

export interface PlayerState {
  id: string;
  name: string;
  commanderName?: string;
  cardBackUrl?: string | null;
  life: number;
  poison: number;
  infect: number;
  // Damage taken from a commander, keyed by the source playerId — plus ":1" for that player's
  // second commander (partner), since each partner counts toward its own 21.
  commanderDamage: Record<string, number>;
  hand: CardInstance[];
  battlefield: CardInstance[];
  library: CardInstance[];
  graveyard: CardInstance[];
  exile: CardInstance[];
  revealed: CardInstance[];
  scrying: CardInstance[];
  scryingZone: PileZone | null;
  commandZone: CardInstance[];
  // How many command-zone squares to show — one per commander (two with a partner), so a
  // commander that's out on the battlefield leaves its own empty square behind.
  commanderSlots?: number;
  // Per command-zone square: whether it holds a commander (owes tax, deals commander damage) or a
  // companion (neither), and the card's name — so partners can be told apart in damage tracking.
  slotKinds?: ("commander" | "companion")[];
  slotNames?: string[];
  commanderTax: number; // total across every commander
  commanderTaxes?: number[]; // per command-zone square, so partners each have their own tax
  wins: number;
  losses: number;
  tokenCards: PlayCardRef[]; // the deck's Token-category cards, summonable onto the battlefield on demand
}

export type DiceKind = "coin" | "d4" | "d6" | "d8" | "d10" | "d12" | "d20";

export interface RollResult {
  id: string;
  playerId: string;
  playerName: string;
  kind: DiceKind;
  results: (string | number)[];
  at: number;
}

export interface AlertPing {
  id: string;
  byPlayerId: string;
  byName: string;
  at: number;
}

export interface RoomState {
  code: string;
  name: string;
  createdAt: number;
  maxPlayers: number;
  isOpen: boolean;
  hostId: string | null;
  players: Record<string, PlayerState>;
  joinOrder: string[];
  log: string[];
  lastRoll: RollResult | null;
  lastAlert: AlertPing | null;
  hasSavedGame: boolean;
}

interface GameRoomsGlobal {
  rooms: Map<string, RoomState>;
  emitter: EventEmitter;
  // Kept out of the broadcast RoomState (which is JSON-serialized on every change) so a saved
  // snapshot doesn't double the payload of every live update. One slot per room, as requested.
  savedGames: Map<string, Omit<RoomState, "hasSavedGame">>;
  // Each seat's secret (never broadcast): only the browser that took a seat can act for it.
  secrets?: Map<string, Map<string, string>>;
  activity?: Map<string, number>;
  sweeper?: ReturnType<typeof setInterval>;
}

const g = globalThis as unknown as { __mtgGameRooms?: GameRoomsGlobal };

const store: GameRoomsGlobal =
  g.__mtgGameRooms ??
  (g.__mtgGameRooms = {
    rooms: new Map(),
    emitter: new EventEmitter().setMaxListeners(200),
    savedGames: new Map(),
  });

const MAX_ROOMS = 300;
const IDLE_MS = 6 * 60 * 60 * 1000;
store.secrets ??= new Map();
store.activity ??= new Map();
if (!store.sweeper) {
  // Rooms nobody has touched for 6 hours (and nobody is watching) are cleared from memory.
  store.sweeper = setInterval(() => {
    const now = Date.now();
    for (const code of store.rooms.keys()) {
      const last = store.activity!.get(code) ?? store.rooms.get(code)!.createdAt;
      if (now - last > IDLE_MS && store.emitter.listenerCount(code) === 0) {
        store.rooms.delete(code);
        store.savedGames.delete(code);
        store.secrets!.delete(code);
        store.activity!.delete(code);
      }
    }
  }, 10 * 60 * 1000);
  store.sweeper.unref?.();
}

/** True if this browser holds the seat (or is taking a free one when joining). */
export function checkSeat(code: string, playerId: string, secret: string, joining: boolean): boolean {
  if (!secret || secret.length < 16 || secret.length > 100) return false;
  let seats = store.secrets!.get(code);
  const known = seats?.get(playerId);
  if (known) return known === secret;
  // A seat with no secret yet: only claimable by joining, and only if nobody sits there already
  // (a player who joined before this protection existed keeps their seat by re-joining once).
  if (!joining) return false;
  if (!seats) store.secrets!.set(code, (seats = new Map()));
  seats.set(playerId, secret);
  return true;
}

export const roomCount = () => store.rooms.size;

function newInstanceId() {
  return Math.random().toString(36).slice(2, 10);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function log(room: RoomState, message: string) {
  room.log.push(message);
  if (room.log.length > 50) room.log.shift();
}

function emitUpdate(code: string) {
  store.activity!.set(code, Date.now());
  store.emitter.emit(code, getRoom(code));
}

function newPlayer(
  id: string,
  name: string,
  cardBackUrl: string | undefined,
  commanderName: string | undefined,
  library: CardInstance[],
  commandZone: CardInstance[],
  tokenCards: PlayCardRef[] = []
): PlayerState {
  // Players start with an opening hand dealt automatically, like a real game.
  const hand = library.splice(0, Math.min(7, library.length));
  return {
    id,
    name,
    commanderName,
    cardBackUrl,
    life: 40,
    poison: 0,
    infect: 0,
    commanderDamage: {},
    hand,
    battlefield: [],
    library,
    graveyard: [],
    exile: [],
    revealed: [],
    scrying: [],
    scryingZone: null,
    commandZone,
    commanderTax: 0,
    wins: 0,
    losses: 0,
    tokenCards,
  };
}

export function getRoom(code: string): RoomState | undefined {
  return store.rooms.get(code);
}

export function createRoom(maxPlayers = 4, isOpen = false, name?: string): string | null {
  if (store.rooms.size >= MAX_ROOMS) return null;
  name = typeof name === "string" ? name.replace(/\s+/g, " ").trim().slice(0, 40) : undefined;
  let code: string;
  do {
    code = Math.random().toString(36).slice(2, 7).toUpperCase();
  } while (store.rooms.has(code));

  const clampedMax = Math.min(4, Math.max(2, Math.round(maxPlayers)));
  store.rooms.set(code, {
    code,
    name: name?.trim() || `Game ${code}`,
    createdAt: Date.now(),
    maxPlayers: clampedMax,
    isOpen,
    hostId: null,
    players: {},
    joinOrder: [],
    log: [],
    lastRoll: null,
    lastAlert: null,
    hasSavedGame: false,
  });
  return code;
}

export function listOpenRooms(): { code: string; name: string; playerCount: number; maxPlayers: number }[] {
  return Array.from(store.rooms.values())
    .filter((r) => r.isOpen && Object.keys(r.players).length < r.maxPlayers)
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((r) => ({
      code: r.code,
      name: r.name,
      playerCount: Object.keys(r.players).length,
      maxPlayers: r.maxPlayers,
    }));
}

export function subscribe(code: string, cb: (room: RoomState) => void) {
  store.emitter.on(code, cb);
  return () => store.emitter.off(code, cb);
}

export interface PlayCardRef {
  scryfallId: string;
  name: string;
  imageUrl?: string;
  backImageUrl?: string;
}

export function joinRoom(
  code: string,
  playerId: string,
  name: string,
  deckCards?: PlayCardRef[],
  cardBackUrl?: string,
  commanderName?: string,
  commanderCard?: PlayCardRef,
  tokenCards?: PlayCardRef[],
  // A partner commander or a companion — either way, a second card that joins the commander in
  // the command zone. Decks only ever have one or the other, never both.
  extraCommandZoneCard?: PlayCardRef,
  extraKind: "partner" | "companion" = "partner"
): { ok: true; room: RoomState } | { ok: false; error: string } {
  name = String(name ?? "").replace(/\s+/g, " ").trim().slice(0, 30) || "Player";
  let room = store.rooms.get(code);
  if (!room) {
    if (store.rooms.size >= MAX_ROOMS || !/^[A-Z0-9]{4,8}$/.test(code)) return { ok: false, error: "That game doesn't exist." };
    room = {
      code,
      name: `Game ${code}`,
      createdAt: Date.now(),
      maxPlayers: 4,
      isOpen: false,
      hostId: null,
      players: {},
      joinOrder: [],
      log: [],
      lastRoll: null,
      lastAlert: null,
      hasSavedGame: false,
    };
    store.rooms.set(code, room);
  }

  if (!room.players[playerId] && Object.keys(room.players).length >= room.maxPlayers) {
    return { ok: false, error: `Room is full (max ${room.maxPlayers} players).` };
  }

  if (!room.hostId) room.hostId = playerId;

  if (!room.players[playerId]) {
    const toCard = (c: PlayCardRef): CardInstance => ({
      instanceId: newInstanceId(),
      scryfallId: c.scryfallId,
      name: c.name,
      imageUrl: c.imageUrl,
      backImageUrl: c.backImageUrl,
      counters: 0,
      tapped: false,
      x: 0,
      y: 0,
    });

    const library: CardInstance[] = deckCards ? shuffle(deckCards.map(toCard)) : [];
    const commandZone: CardInstance[] = commanderCard ? [toCard(commanderCard)] : [];
    if (extraCommandZoneCard) commandZone.push(toCard(extraCommandZoneCard));
    commandZone.forEach((c, i) => (c.commandSlot = i));

    room.players[playerId] = newPlayer(
      playerId,
      name,
      cardBackUrl,
      commanderName,
      library,
      commandZone,
      tokenCards ?? []
    );
    room.players[playerId].commanderSlots = commandZone.length;
    room.players[playerId].slotKinds = commandZone.map((_, i) =>
      i === 1 && extraKind === "companion" ? "companion" : "commander"
    );
    room.players[playerId].slotNames = commandZone.map((c) => c.name);
    room.joinOrder.push(playerId);
    log(room, `${name} joined the game.`);
  } else {
    // Reconnecting to a room already in progress (page refresh, tab reopened, etc.) — refresh
    // whatever's read straight from the deck without touching hand/library/battlefield, so
    // e.g. adding a token to the deck after joining is picked up without restarting the game.
    room.players[playerId].name = name;
    if (tokenCards) room.players[playerId].tokenCards = tokenCards;
  }

  emitUpdate(code);
  return { ok: true, room };
}

// --- Pile helpers -----------------------------------------------------
// "Top" of the library is index 0 (the library is pre-shuffled so the front is arbitrary
// but represents the top of the deck by convention). Graveyard/exile are LIFO piles built
// via push(), so their "top" (the most recently added, most visually prominent card) is the
// last array element.

function pileArray(player: PlayerState, zone: PileZone): CardInstance[] {
  return player[zone];
}

function takePileTop(player: PlayerState, zone: PileZone): CardInstance | undefined {
  if (zone === "library") return player.library.shift();
  return pileArray(player, zone).pop();
}

function zoneLabel(zone: PileZone) {
  return zone === "library" ? "library" : zone;
}

type DestZone =
  | "hand"
  | "battlefield"
  | "library-top"
  | "library-bottom"
  | "graveyard"
  | "exile"
  | "commandZone";

function placeCard(player: PlayerState, dest: DestZone, card: CardInstance) {
  switch (dest) {
    case "hand":
      player.hand.push(card);
      break;
    case "battlefield":
      card.x = 10 + Math.random() * 60;
      card.y = 10 + Math.random() * 60;
      card.tapped = false;
      player.battlefield.push(card);
      break;
    case "library-top":
      card.tapped = false;
      player.library.unshift(card);
      break;
    case "library-bottom":
      card.tapped = false;
      player.library.push(card);
      break;
    case "graveyard":
      // Tokens and copies cease to exist outside the battlefield rather than piling up here.
      if (!card.isToken && !card.isCopy) player.graveyard.push(card);
      break;
    case "exile":
      if (!card.isToken && !card.isCopy) player.exile.push(card);
      break;
    case "commandZone":
      card.tapped = false;
      player.commandZone.push(card);
      // The commander tax: every time it returns to the command zone (from anywhere, once the
      // game is already underway) it costs 2 more generic mana to recast next time. Each
      // commander has its own tax, tracked per command-zone square (a partner pair doesn't share).
      if (player.slotKinds?.[card.commandSlot ?? 0] !== "companion") {
        const slot = card.commandSlot ?? 0;
        const taxes = (player.commanderTaxes ??= []);
        while (taxes.length <= slot) taxes.push(0);
        taxes[slot] += 2;
        player.commanderTax = taxes.reduce((s, t) => s + t, 0);
      }
      break;
  }
}

function destLabel(dest: DestZone) {
  switch (dest) {
    case "hand":
      return "their hand";
    case "battlefield":
      return "the battlefield";
    case "library-top":
      return "the top of their library";
    case "library-bottom":
      return "the bottom of their library";
    case "graveyard":
      return "their graveyard";
    case "exile":
      return "exile";
    case "commandZone":
      return "the command zone";
  }
}

export function pileDraw(code: string, playerId: string, source: PileZone) {
  const room = store.rooms.get(code);
  const player = room?.players[playerId];
  if (!room || !player) return;
  const card = takePileTop(player, source);
  if (!card) {
    log(room, `${player.name} tried to draw from an empty ${zoneLabel(source)}!`);
    emitUpdate(code);
    return;
  }
  placeCard(player, "hand", card);
  log(room, `${player.name} drew ${card.name} from their ${zoneLabel(source)}.`);
  emitUpdate(code);
}

export function pileDrawMultiple(code: string, playerId: string, source: PileZone, count: number) {
  const room = store.rooms.get(code);
  const player = room?.players[playerId];
  if (!room || !player) return;
  const n = Math.max(1, Math.min(50, Math.round(count)));
  let drawn = 0;
  for (let i = 0; i < n; i++) {
    const card = takePileTop(player, source);
    if (!card) break;
    placeCard(player, "hand", card);
    drawn++;
  }
  log(room, `${player.name} drew ${drawn} card${drawn === 1 ? "" : "s"} from their ${zoneLabel(source)}.`);
  emitUpdate(code);
}

export function pileToZone(code: string, playerId: string, source: PileZone, dest: DestZone) {
  const room = store.rooms.get(code);
  const player = room?.players[playerId];
  if (!room || !player) return;
  const card = takePileTop(player, source);
  if (!card) {
    log(room, `${player.name} tried to move a card from an empty ${zoneLabel(source)}!`);
    emitUpdate(code);
    return;
  }
  placeCard(player, dest, card);
  log(room, `${player.name} moved ${card.name} from their ${zoneLabel(source)} to ${destLabel(dest)}.`);
  emitUpdate(code);
}

export function pileSearchMoveToHand(code: string, playerId: string, source: PileZone, instanceId: string) {
  const room = store.rooms.get(code);
  const player = room?.players[playerId];
  if (!room || !player) return;
  const arr = pileArray(player, source);
  const idx = arr.findIndex((c) => c.instanceId === instanceId);
  if (idx === -1) return;
  const [card] = arr.splice(idx, 1);
  player.hand.push(card);
  if (source === "library") player.library = shuffle(player.library);
  log(room, `${player.name} searched their ${zoneLabel(source)} for ${card.name}.`);
  emitUpdate(code);
}

export function pileRevealTop(code: string, playerId: string, source: PileZone) {
  const room = store.rooms.get(code);
  const player = room?.players[playerId];
  if (!room || !player) return;
  const card = takePileTop(player, source);
  if (!card) {
    log(room, `${player.name} tried to reveal from an empty ${zoneLabel(source)}!`);
    emitUpdate(code);
    return;
  }
  player.revealed.push(card);
  log(room, `${player.name} revealed ${card.name} from the top of their ${zoneLabel(source)}.`);
  emitUpdate(code);
}

export function revealedToHand(code: string, playerId: string, instanceId: string) {
  const room = store.rooms.get(code);
  const player = room?.players[playerId];
  if (!room || !player) return;

  const idx = player.revealed.findIndex((c) => c.instanceId === instanceId);
  if (idx === -1) return;
  const [card] = player.revealed.splice(idx, 1);
  player.hand.push(card);
  log(room, `${player.name} took the revealed ${card.name} into their hand.`);
  emitUpdate(code);
}

export function pileScry(code: string, playerId: string, source: PileZone, count: number) {
  const room = store.rooms.get(code);
  const player = room?.players[playerId];
  if (!room || !player) return;
  const n = Math.max(1, Math.min(20, Math.round(count)));
  const cards: CardInstance[] = [];
  for (let i = 0; i < n; i++) {
    const card = takePileTop(player, source);
    if (!card) break;
    cards.push(card);
  }
  player.scrying.push(...cards);
  player.scryingZone = source;
  log(room, `${player.name} is scrying ${cards.length} from their ${zoneLabel(source)}.`);
  emitUpdate(code);
}

export function scryResolve(code: string, playerId: string, instanceId: string, toBottom: boolean) {
  const room = store.rooms.get(code);
  const player = room?.players[playerId];
  if (!room || !player) return;

  const idx = player.scrying.findIndex((c) => c.instanceId === instanceId);
  if (idx === -1) return;
  const [card] = player.scrying.splice(idx, 1);
  const zone = player.scryingZone ?? "library";

  if (zone === "library") {
    if (toBottom) player.library.push(card);
    else player.library.unshift(card);
  } else {
    const arr = pileArray(player, zone);
    // "top" of a LIFO pile is the end of the array, "bottom" is the start.
    if (toBottom) arr.unshift(card);
    else arr.push(card);
  }

  if (player.scrying.length === 0) {
    player.scryingZone = null;
    log(room, `${player.name} finished scrying.`);
  }
  emitUpdate(code);
}

// --- Individual card movement (right-click on any card, in any zone) --

function findCardLocation(
  player: PlayerState,
  instanceId: string
): { zone: CardZone; arr: CardInstance[]; idx: number } | null {
  const zones: CardZone[] = [
    "battlefield",
    "hand",
    "library",
    "graveyard",
    "exile",
    "revealed",
    "scrying",
    "commandZone",
  ];
  for (const zone of zones) {
    const arr = player[zone] as CardInstance[];
    const idx = arr.findIndex((c) => c.instanceId === instanceId);
    if (idx !== -1) return { zone, arr, idx };
  }
  return null;
}

export function setCardTapped(code: string, playerId: string, instanceId: string, tapped: boolean) {
  const room = store.rooms.get(code);
  const player = room?.players[playerId];
  if (!room || !player) return;
  const loc = findCardLocation(player, instanceId);
  if (!loc) return;
  loc.arr[loc.idx].tapped = tapped;
  emitUpdate(code);
}

export function moveCardToLibrary(
  code: string,
  playerId: string,
  instanceId: string,
  position: "top" | "bottom"
) {
  const room = store.rooms.get(code);
  const player = room?.players[playerId];
  if (!room || !player) return;
  const loc = findCardLocation(player, instanceId);
  if (!loc) return;
  const [card] = loc.arr.splice(loc.idx, 1);
  card.tapped = false;
  if (position === "top") player.library.unshift(card);
  else player.library.push(card);
  if (loc.zone === "scrying" && player.scrying.length === 0) player.scryingZone = null;
  log(room, `${player.name} moved ${card.name} to the ${position} of their library.`);
  emitUpdate(code);
}

// Copies always enter the battlefield, same as a real "copy" effect — regardless of which zone
// the original card is currently sitting in.
export function copyCard(code: string, playerId: string, instanceId: string) {
  const room = store.rooms.get(code);
  const player = room?.players[playerId];
  if (!room || !player) return;
  // The hovered card can belong to any seat at the table — search every player's zones (not
  // just the caller's) so copying a card off an opponent's board works the same as your own.
  let loc: ReturnType<typeof findCardLocation> = null;
  for (const p of Object.values(room.players)) {
    loc = findCardLocation(p, instanceId);
    if (loc) break;
  }
  if (!loc) return;
  const original = loc.arr[loc.idx];
  const onBattlefield = loc.zone === "battlefield";
  const copy: CardInstance = {
    ...original,
    instanceId: newInstanceId(),
    x: onBattlefield ? Math.max(0, Math.min(92, original.x + 4)) : 10 + Math.random() * 60,
    y: onBattlefield ? Math.max(0, Math.min(80, original.y + 4)) : 10 + Math.random() * 60,
    tapped: false,
    isCopy: true,
  };
  player.battlefield.push(copy);
  log(room, `${player.name} created a copy of ${original.name}.`);
  emitUpdate(code);
}

// Drag-and-drop: move any card the player has (hand, battlefield, or a pile) directly to a
// target zone. Dropping onto the battlefield honors the exact x/y percentage it was dropped
// at instead of a random spot.
export function dropCardOn(
  code: string,
  playerId: string,
  instanceId: string,
  dest: DestZone,
  x?: number,
  y?: number
) {
  const room = store.rooms.get(code);
  const player = room?.players[playerId];
  if (!room || !player) return;

  const loc = findCardLocation(player, instanceId);
  if (!loc) return;
  const [card] = loc.arr.splice(loc.idx, 1);

  if (dest === "battlefield") {
    card.x = x !== undefined ? Math.max(0, Math.min(92, x)) : 10 + Math.random() * 60;
    card.y = y !== undefined ? Math.max(0, Math.min(80, y)) : 10 + Math.random() * 60;
    card.tapped = false;
    player.battlefield.push(card);
  } else {
    placeCard(player, dest, card);
  }

  if (loc.zone === "scrying" && player.scrying.length === 0) player.scryingZone = null;
  if ((card.isToken || card.isCopy) && (dest === "graveyard" || dest === "exile")) {
    log(room, `${player.name}'s ${card.name} ${card.isCopy ? "copy" : "token"} was destroyed.`);
  } else {
    log(room, `${player.name} moved ${card.name} to ${destLabel(dest)}.`);
  }
  emitUpdate(code);
}

export function playCard(code: string, playerId: string, instanceId: string) {
  const room = store.rooms.get(code);
  const player = room?.players[playerId];
  if (!room || !player) return;

  const idx = player.hand.findIndex((c) => c.instanceId === instanceId);
  if (idx === -1) return;

  const [card] = player.hand.splice(idx, 1);
  card.x = 10 + Math.random() * 60;
  card.y = 10 + Math.random() * 60;
  player.battlefield.push(card);
  log(room, `${player.name} played ${card.name}.`);
  emitUpdate(code);
}

export function returnToHand(code: string, playerId: string, instanceId: string) {
  const room = store.rooms.get(code);
  const player = room?.players[playerId];
  if (!room || !player) return;

  const idx = player.battlefield.findIndex((c) => c.instanceId === instanceId);
  if (idx === -1) return;

  const [card] = player.battlefield.splice(idx, 1);
  card.tapped = false;
  player.hand.push(card);
  log(room, `${player.name} returned ${card.name} to hand.`);
  emitUpdate(code);
}

export function tapCard(code: string, playerId: string, instanceId: string) {
  const room = store.rooms.get(code);
  const player = room?.players[playerId];
  if (!room || !player) return;

  const card = player.battlefield.find((c) => c.instanceId === instanceId);
  if (!card) return;

  card.tapped = !card.tapped;
  emitUpdate(code);
}

export function moveCard(code: string, playerId: string, instanceId: string, x: number, y: number) {
  const room = store.rooms.get(code);
  const player = room?.players[playerId];
  if (!room || !player) return;

  const card = player.battlefield.find((c) => c.instanceId === instanceId);
  if (!card) return;

  card.x = Math.max(0, Math.min(92, x));
  card.y = Math.max(0, Math.min(80, y));
  emitUpdate(code);
}

export function adjustLife(code: string, playerId: string, delta: number) {
  const room = store.rooms.get(code);
  const player = room?.players[playerId];
  if (!room || !player) return;

  player.life += delta;
  emitUpdate(code);
}

export function adjustCounter(code: string, playerId: string, counter: "poison" | "infect", delta: number) {
  const room = store.rooms.get(code);
  const player = room?.players[playerId];
  if (!room || !player) return;

  player[counter] = Math.max(0, player[counter] + delta);
  emitUpdate(code);
}

export function adjustCommanderDamage(
  code: string,
  playerId: string,
  fromPlayerId: string,
  delta: number,
  slot = 0
) {
  const room = store.rooms.get(code);
  const player = room?.players[playerId];
  if (!room || !player) return;

  const key = slot > 0 ? `${fromPlayerId}:${slot}` : fromPlayerId;
  const current = player.commanderDamage[key] ?? 0;
  player.commanderDamage[key] = Math.max(0, current + delta);
  emitUpdate(code);
}

export function addCounters(code: string, playerId: string, instanceId: string, delta: number) {
  const room = store.rooms.get(code);
  const player = room?.players[playerId];
  if (!room || !player) return;
  const loc = findCardLocation(player, instanceId);
  if (!loc) return;
  const card = loc.arr[loc.idx];
  card.counters = (card.counters ?? 0) + delta;
  emitUpdate(code);
}

export function flipCard(code: string, playerId: string, instanceId: string) {
  const room = store.rooms.get(code);
  const player = room?.players[playerId];
  if (!room || !player) return;
  const loc = findCardLocation(player, instanceId);
  if (!loc) return;
  const card = loc.arr[loc.idx];
  if (!card.backImageUrl) return;
  card.facingBack = !card.facingBack;
  emitUpdate(code);
}

export function shuffleLibrary(code: string, playerId: string) {
  const room = store.rooms.get(code);
  const player = room?.players[playerId];
  if (!room || !player) return;

  player.library = shuffle(player.library);
  log(room, `${player.name} shuffled their library.`);
  emitUpdate(code);
}

// A full reset, not just a hand mulligan: every card the player has anywhere (hand,
// battlefield, graveyard, exile, revealed, scrying) shuffles back into their library before
// redrawing, so the "Mulligan" button doubles as a "restart this game" button.
export function mulligan(code: string, playerId: string, handSize = 7) {
  const room = store.rooms.get(code);
  const player = room?.players[playerId];
  if (!room || !player) return;

  const everything = [
    ...player.library,
    ...player.hand,
    ...player.battlefield,
    ...player.graveyard,
    ...player.exile,
    ...player.revealed,
    ...player.scrying,
  ].map((c) => ({ ...c, tapped: false, x: 0, y: 0 }));

  player.library = shuffle(everything);
  player.hand = [];
  player.battlefield = [];
  player.graveyard = [];
  player.exile = [];
  player.revealed = [];
  player.scrying = [];
  player.scryingZone = null;

  player.hand = player.library.splice(0, handSize);
  log(room, `${player.name} shuffled everything back into their library and drew ${handSize}.`);
  emitUpdate(code);
}

// --- Dice, coins, alerts ------------------------------------------------

export function rollDice(code: string, playerId: string, kind: DiceKind, count: number) {
  const room = store.rooms.get(code);
  const player = room?.players[playerId];
  if (!room || !player) return;

  const n = Math.max(1, Math.min(20, Math.round(count)));
  const sides = kind === "coin" ? 2 : Number(kind.slice(1));
  const results: (string | number)[] = Array.from({ length: n }, () =>
    kind === "coin" ? (Math.random() < 0.5 ? "Heads" : "Tails") : 1 + Math.floor(Math.random() * sides)
  );

  room.lastRoll = {
    id: newInstanceId(),
    playerId,
    playerName: player.name,
    kind,
    results,
    at: Date.now(),
  };
  const label = kind === "coin" ? `${n} coin flip${n === 1 ? "" : "s"}` : `${n}${kind}`;
  log(room, `${player.name} rolled ${label}: ${results.join(", ")}`);
  emitUpdate(code);
}

export function sendAlert(code: string, playerId: string) {
  const room = store.rooms.get(code);
  const player = room?.players[playerId];
  if (!room || !player) return;

  room.lastAlert = { id: newInstanceId(), byPlayerId: playerId, byName: player.name, at: Date.now() };
  log(room, `${player.name} sent an alert!`);
  emitUpdate(code);
}

export function tapAllBattlefield(code: string, playerId: string, tapped: boolean) {
  const room = store.rooms.get(code);
  const player = room?.players[playerId];
  if (!room || !player) return;

  for (const card of player.battlefield) card.tapped = tapped;
  log(room, `${player.name} ${tapped ? "tapped" : "untapped"} everything.`);
  emitUpdate(code);
}

// --- Save / load (host only, one slot per room) -------------------------

export function saveGame(code: string, playerId: string): { ok: boolean; error?: string } {
  const room = store.rooms.get(code);
  if (!room) return { ok: false, error: "Room not found." };
  if (room.hostId !== playerId) return { ok: false, error: "Only the host can save the game." };

  const snapshot: Omit<RoomState, "hasSavedGame"> & { hasSavedGame?: boolean } = { ...room };
  delete snapshot.hasSavedGame;
  store.savedGames.set(code, structuredClone(snapshot));
  room.hasSavedGame = true;
  log(room, `${room.players[playerId]?.name ?? "The host"} saved the game.`);
  emitUpdate(code);
  return { ok: true };
}

export function loadGame(code: string, playerId: string): { ok: boolean; error?: string } {
  const room = store.rooms.get(code);
  if (!room) return { ok: false, error: "Room not found." };
  if (room.hostId !== playerId) return { ok: false, error: "Only the host can load the saved game." };

  const saved = store.savedGames.get(code);
  if (!saved) return { ok: false, error: "No saved game found." };

  const restored = structuredClone(saved);
  room.players = restored.players;
  room.joinOrder = restored.joinOrder;
  room.log = restored.log;
  log(room, `${room.players[playerId]?.name ?? "The host"} loaded the saved game.`);
  emitUpdate(code);
  return { ok: true };
}

// --- End game / restart / new deck / win-loss record --------------------

// Every player's hand, battlefield, graveyard, and exile shuffle back into their own library.
// The command zone (and its commander) is left alone, matching the real rule that a commander
// never really "leaves the game" between matches at the table.
export function endGame(code: string) {
  const room = store.rooms.get(code);
  if (!room) return;

  for (const player of Object.values(room.players)) {
    const everything = [
      ...player.hand,
      ...player.battlefield,
      ...player.graveyard,
      ...player.exile,
      ...player.revealed,
      ...player.scrying,
    ].map((c) => ({ ...c, tapped: false, x: 0, y: 0, counters: 0, facingBack: false }));

    player.library = shuffle([...player.library, ...everything]);
    player.hand = [];
    player.battlefield = [];
    player.graveyard = [];
    player.exile = [];
    player.revealed = [];
    player.scrying = [];
    player.scryingZone = null;
  }

  log(room, "The game has ended — every card has returned to each player's deck.");
  emitUpdate(code);
}

export function playAgain(code: string, playerId: string, handSize = 7) {
  const room = store.rooms.get(code);
  const player = room?.players[playerId];
  if (!room || !player) return;

  player.library = shuffle(player.library);
  player.life = 40;
  player.poison = 0;
  player.infect = 0;
  player.commanderDamage = {};
  player.commanderTax = 0;
  player.commanderTaxes = [];
  player.hand = player.library.splice(0, handSize);
  log(room, `${player.name} started a new game.`);
  emitUpdate(code);
}

export function selectNewDeck(
  code: string,
  playerId: string,
  deckCards: PlayCardRef[],
  cardBackUrl: string | undefined,
  commanderName: string | undefined,
  commanderCard: PlayCardRef | undefined,
  tokenCards: PlayCardRef[] = [],
  extraCommandZoneCard?: PlayCardRef,
  extraKind: "partner" | "companion" = "partner"
) {
  const room = store.rooms.get(code);
  const player = room?.players[playerId];
  if (!room || !player) return;

  const toCard = (c: PlayCardRef): CardInstance => ({
    instanceId: newInstanceId(),
    scryfallId: c.scryfallId,
    name: c.name,
    imageUrl: c.imageUrl,
    backImageUrl: c.backImageUrl,
    counters: 0,
    tapped: false,
    x: 0,
    y: 0,
  });

  const library = shuffle(deckCards.map(toCard));
  const commandZone = commanderCard ? [toCard(commanderCard)] : [];
  if (extraCommandZoneCard) commandZone.push(toCard(extraCommandZoneCard));
  commandZone.forEach((c, i) => (c.commandSlot = i));

  player.cardBackUrl = cardBackUrl;
  player.commanderName = commanderName;
  player.library = library;
  player.hand = library.splice(0, 7);
  player.battlefield = [];
  player.graveyard = [];
  player.exile = [];
  player.revealed = [];
  player.scrying = [];
  player.scryingZone = null;
  player.commandZone = commandZone;
  player.commanderSlots = commandZone.length;
  player.slotKinds = commandZone.map((_, i) =>
    i === 1 && extraKind === "companion" ? "companion" : "commander"
  );
  player.slotNames = commandZone.map((c) => c.name);
  player.tokenCards = tokenCards;
  player.commanderTax = 0;
  player.commanderTaxes = [];
  player.life = 40;
  player.poison = 0;
  player.infect = 0;
  player.commanderDamage = {};

  log(room, `${player.name} selected a new deck.`);
  emitUpdate(code);
}

// Tokens are summoned straight onto the battlefield from the deck's Token-category reference
// list rather than drawn from the library — there's an unlimited supply of each, matching how
// tokens work in real Commander games.
export function summonToken(code: string, playerId: string, scryfallId: string, x?: number, y?: number) {
  const room = store.rooms.get(code);
  const player = room?.players[playerId];
  if (!room || !player) return;
  const ref = player.tokenCards.find((c) => c.scryfallId === scryfallId);
  if (!ref) return;

  const card: CardInstance = {
    instanceId: newInstanceId(),
    scryfallId: ref.scryfallId,
    name: ref.name,
    imageUrl: ref.imageUrl,
    backImageUrl: ref.backImageUrl,
    counters: 0,
    tapped: false,
    x: x !== undefined ? Math.max(0, Math.min(92, x)) : 10 + Math.random() * 60,
    y: y !== undefined ? Math.max(0, Math.min(80, y)) : 10 + Math.random() * 60,
    isToken: true,
  };
  player.battlefield.push(card);
  log(room, `${player.name} summoned a ${card.name} token.`);
  emitUpdate(code);
}

export function recordGameResult(code: string, winnerId: string | null) {
  const room = store.rooms.get(code);
  if (!room) return;

  if (!winnerId || !room.players[winnerId]) {
    log(room, "The game ended with no declared winner.");
    emitUpdate(code);
    return;
  }

  for (const id of Object.keys(room.players)) {
    if (id === winnerId) room.players[id].wins += 1;
    else room.players[id].losses += 1;
  }
  log(room, `${room.players[winnerId].name} won the game!`);
  emitUpdate(code);
}
