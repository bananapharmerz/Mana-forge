import { securityEvent } from "@/lib/securityLog";
import { NextResponse } from "next/server";
import {
  joinRoom,
  pileDraw,
  pileDrawMultiple,
  pileToZone,
  pileSearchMoveToHand,
  pileRevealTop,
  revealedToHand,
  pileScry,
  scryResolve,
  setCardTapped,
  moveCardToLibrary,
  dropCardOn,
  playCard,
  returnToHand,
  tapCard,
  moveCard,
  adjustLife,
  adjustCounter,
  adjustCommanderDamage,
  addCounters,
  flipCard,
  shuffleLibrary,
  mulligan,
  rollDice,
  sendAlert,
  tapAllBattlefield,
  saveGame,
  loadGame,
  endGame,
  playAgain,
  selectNewDeck,
  recordGameResult,
  summonToken,
  copyCard,
  checkSeat,
  type PileZone,
  type DiceKind,
} from "@/lib/gameRooms";
import { hit, ipFrom } from "@/lib/rateLimit";
import { cleanCardBack, cleanPlayCard, cleanPlayCards, text } from "@/lib/validate";

const CARD_BACK_PRESETS = ["classic", "crimson", "emerald", "amethyst", "obsidian", "sunburst"];

export async function POST(
  req: Request,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  const { roomCode } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const { type } = body;
  const playerId = typeof body.playerId === "string" ? body.playerId : "";

  if (!/^[a-z0-9]{4,40}$/i.test(playerId)) {
    return NextResponse.json({ error: "Missing playerId" }, { status: 400 });
  }
  // Generous, but stops a script from flooding a room.
  if (!hit(`play-action:${ipFrom(req.headers)}`, 600, 60 * 1000)) {
    return NextResponse.json({ error: "Too many actions. Slow down a moment." }, { status: 429 });
  }
  // Only the browser that took this seat can act for it.
  if (!checkSeat(roomCode, playerId, typeof body.secret === "string" ? body.secret : "", type === "join")) {
    securityEvent("seat_rejected", "play");
    return NextResponse.json({ error: "This seat belongs to someone else. Reload the page to rejoin." }, { status: 403 });
  }

  const source: PileZone = body.source;

  switch (type) {
    case "join": {
      const result = joinRoom(
        roomCode,
        playerId,
        text(body.name, 30),
        body.deckCards === undefined ? undefined : cleanPlayCards(body.deckCards, 300),
        cleanCardBack(body.cardBackUrl, CARD_BACK_PRESETS) ?? undefined,
        body.commanderName === undefined ? undefined : text(body.commanderName, 150),
        cleanPlayCard(body.commanderCard) ?? undefined,
        body.tokenCards === undefined ? undefined : cleanPlayCards(body.tokenCards, 100),
        cleanPlayCard(body.extraCommandZoneCard) ?? undefined,
        body.extraCommandZoneKind === "companion" ? "companion" : "partner"
      );
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 409 });
      }
      break;
    }
    case "pileDraw":
      pileDraw(roomCode, playerId, source);
      break;
    case "pileDrawMultiple":
      pileDrawMultiple(roomCode, playerId, source, Number(body.count) || 1);
      break;
    case "pileToZone":
      pileToZone(roomCode, playerId, source, body.dest);
      break;
    case "pileSearchMoveToHand":
      pileSearchMoveToHand(roomCode, playerId, source, body.instanceId);
      break;
    case "pileRevealTop":
      pileRevealTop(roomCode, playerId, source);
      break;
    case "revealedToHand":
      revealedToHand(roomCode, playerId, body.instanceId);
      break;
    case "pileScry":
      pileScry(roomCode, playerId, source, Number(body.count) || 1);
      break;
    case "scryResolve":
      scryResolve(roomCode, playerId, body.instanceId, Boolean(body.toBottom));
      break;
    case "setCardTapped":
      setCardTapped(roomCode, playerId, body.instanceId, Boolean(body.tapped));
      break;
    case "moveCardToLibrary":
      moveCardToLibrary(roomCode, playerId, body.instanceId, body.position);
      break;
    case "dropCardOn":
      dropCardOn(roomCode, playerId, body.instanceId, body.dest, body.x, body.y);
      break;
    case "play":
      playCard(roomCode, playerId, body.instanceId);
      break;
    case "returnToHand":
      returnToHand(roomCode, playerId, body.instanceId);
      break;
    case "tap":
      tapCard(roomCode, playerId, body.instanceId);
      break;
    case "move":
      moveCard(roomCode, playerId, body.instanceId, body.x, body.y);
      break;
    case "life":
      adjustLife(roomCode, playerId, body.delta);
      break;
    case "counter":
      adjustCounter(roomCode, playerId, body.counter, body.delta);
      break;
    case "commanderDamage":
      adjustCommanderDamage(roomCode, playerId, body.fromPlayerId, body.delta, Number(body.slot) || 0);
      break;
    case "addCounters":
      addCounters(roomCode, playerId, body.instanceId, Number(body.delta) || 0);
      break;
    case "flipCard":
      flipCard(roomCode, playerId, body.instanceId);
      break;
    case "shuffle":
      shuffleLibrary(roomCode, playerId);
      break;
    case "mulligan":
      mulligan(roomCode, playerId, body.handSize ?? 7);
      break;
    case "rollDice":
      rollDice(roomCode, playerId, body.kind as DiceKind, Number(body.count) || 1);
      break;
    case "sendAlert":
      sendAlert(roomCode, playerId);
      break;
    case "tapAllBattlefield":
      tapAllBattlefield(roomCode, playerId, Boolean(body.tapped));
      break;
    case "saveGame": {
      const result = saveGame(roomCode, playerId);
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 403 });
      break;
    }
    case "loadGame": {
      const result = loadGame(roomCode, playerId);
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 403 });
      break;
    }
    case "endGame":
      endGame(roomCode);
      break;
    case "playAgain":
      playAgain(roomCode, playerId, body.handSize ?? 7);
      break;
    case "selectNewDeck":
      selectNewDeck(
        roomCode,
        playerId,
        body.deckCards,
        body.cardBackUrl,
        body.commanderName,
        body.commanderCard,
        body.tokenCards,
        body.extraCommandZoneCard,
        body.extraCommandZoneKind
      );
      break;
    case "recordGameResult":
      recordGameResult(roomCode, body.winnerId ?? null);
      break;
    case "summonToken":
      summonToken(roomCode, playerId, body.scryfallId, body.x, body.y);
      break;
    case "copyCard":
      copyCard(roomCode, playerId, body.instanceId);
      break;
    default:
      return NextResponse.json({ error: "Unknown action type" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
