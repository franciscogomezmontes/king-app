import type { ColyseusTestServer } from "@colyseus/testing";
import type { Room as ClientRoom } from "colyseus.js";
import { legalCardsFor, type GameRules, type PlayerIndex } from "rules-engine";
import type { ActionErrorMessage } from "../src/rooms/messages";
import type { ClientEnvelope } from "../src/rooms/roomView";

export interface TrackedRoom {
  room: ClientRoom;
  seat: PlayerIndex;
  envelope: ClientEnvelope | null;
  errors: ActionErrorMessage[];
}

const DISPLAY_NAMES = ["Alice", "Bob", "Cara", "Deo"];

function track(room: ClientRoom, seat: PlayerIndex): TrackedRoom {
  const tracked: TrackedRoom = { room, seat, envelope: null, errors: [] };
  room.onMessage("envelope", (message: ClientEnvelope) => {
    tracked.envelope = message;
  });
  room.onMessage("action-error", (message: ActionErrorMessage) => {
    tracked.errors.push(message);
  });
  return tracked;
}

/** Creates a room and joins all 4 seats in order (join order == seat order, since `onJoin`
 * assigns the first open seat) — the network equivalent of `rules-engine/test/game/
 * fullGame.test.ts`'s single-process `createGame` + loop, but driven entirely through real
 * client/server messages.
 *
 * Joins are sequential, not `Promise.all`-parallel, and each room's message handlers are attached
 * immediately after ITS OWN connect resolves — not batched at the end. The server broadcasts a
 * fresh envelope to every already-connected client as soon as each new seat joins, so batching
 * handler registration until all 4 are connected would race: an earlier client's broadcast can
 * arrive before its handler is attached, and colyseus.js silently drops a message with no
 * registered handler for its type instead of queuing it. */
export async function connectFourPlayers(
  colyseus: ColyseusTestServer,
  ruleSet?: Partial<GameRules>,
): Promise<TrackedRoom[]> {
  const host = await colyseus.sdk.create<unknown>("king_room", { ruleSet, displayName: DISPLAY_NAMES[0] });
  const rooms: TrackedRoom[] = [track(host, 0)];

  for (let seat = 1; seat <= 3; seat++) {
    const room = await colyseus.sdk.joinById<unknown>(host.roomId, { displayName: DISPLAY_NAMES[seat] });
    rooms.push(track(room, seat as PlayerIndex));
  }

  return rooms;
}

/** Polls a tracked room's latest envelope until `predicate` is true, or times out. Network
 * message delivery (even loopback, in-process) is asynchronous, so tests can't assume an envelope
 * has arrived immediately after sending an action. */
export async function waitFor(
  tracked: TrackedRoom,
  predicate: (envelope: ClientEnvelope) => boolean,
  timeoutMs = 2000,
): Promise<ClientEnvelope> {
  const start = Date.now();
  for (;;) {
    if (tracked.envelope !== null && predicate(tracked.envelope)) return tracked.envelope;
    if (Date.now() - start > timeoutMs) {
      throw new Error(`waitFor timed out after ${timeoutMs}ms (last envelope: ${JSON.stringify(tracked.envelope)})`);
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

/** Waits for at least one `action-error` to have arrived for this room. */
export async function waitForError(tracked: TrackedRoom, timeoutMs = 2000): Promise<ActionErrorMessage> {
  const start = Date.now();
  for (;;) {
    if (tracked.errors.length > 0) return tracked.errors[tracked.errors.length - 1];
    if (Date.now() - start > timeoutMs) throw new Error(`waitForError timed out after ${timeoutMs}ms`);
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

export function closeAll(rooms: TrackedRoom[]): Promise<unknown> {
  return Promise.all(rooms.map((r) => r.room.leave()));
}

/** Plays one legal card for whichever seat's turn it is, using `rooms[0]`'s envelope as the single
 * source of truth for "what should happen next" (an individual actor's own envelope may not have
 * been delivered yet the instant after another seat acts — driving off one consistent reference
 * avoids that race). */
export async function playOneLegalCard(rooms: TrackedRoom[]): Promise<void> {
  const reference = rooms[0].envelope;
  if (reference === null || reference.game.phase !== "playing") {
    throw new Error(`playOneLegalCard called outside the playing phase (phase: ${reference?.game.phase})`);
  }
  const seat = reference.game.currentTurn;
  const acting = rooms[seat];
  const legal = legalCardsFor(acting.envelope!.game, seat);
  if (legal.length === 0) throw new Error(`seat ${seat} has no legal cards`);

  const beforePhase = reference.game.phase;
  const beforeTrickCount = reference.game.completedTricks.length;
  const beforeHandIndex = reference.game.handIndex;
  acting.room.send("action", { type: "PLAY_CARD", card: legal[0] });
  await waitFor(
    rooms[0],
    (e) =>
      e.game.phase !== beforePhase ||
      e.game.completedTricks.length !== beforeTrickCount ||
      e.game.handIndex !== beforeHandIndex ||
      e.game.currentTurn !== seat,
  );
}

/** For a positive hand's trump-selection: the trump-namer always declares directly (never opens
 * an auction) — the simplest reliable path for driving a hand to completion. A separate,
 * dedicated test exercises the auction/bid-turn-order flow explicitly. */
export async function declareTrumpDirectly(rooms: TrackedRoom[]): Promise<void> {
  const reference = rooms[0].envelope!;
  const trumpNamer = reference.game.positiveSetup!.trumpNamer;
  rooms[trumpNamer].room.send("action", { type: "DECLARE_TRUMP", trump: "S", direction: "up", backwards: false });
  await waitFor(rooms[0], (e) => e.game.phase !== "trump-selection");
}

export async function advanceHand(rooms: TrackedRoom[]): Promise<void> {
  const beforeHandIndex = rooms[0].envelope!.game.handIndex;
  rooms[0].room.send("action", { type: "ADVANCE_HAND" });
  await waitFor(rooms[0], (e) => e.game.handIndex !== beforeHandIndex || e.game.phase === "game-complete");
}

/** Drives the CURRENT hand only, from wherever it currently is, until `"hand-complete"` (or the
 * game finishes on this hand). Does not call `advanceHand` itself — callers decide when to. */
export async function playHandToComplete(rooms: TrackedRoom[]): Promise<void> {
  for (;;) {
    const phase = rooms[0].envelope!.game.phase;
    if (phase === "hand-complete" || phase === "game-complete") return;
    if (phase === "playing") await playOneLegalCard(rooms);
    else if (phase === "trump-selection") await declareTrumpDirectly(rooms);
    else throw new Error(`playHandToComplete: unexpected phase "${phase}"`);
  }
}

/** Drives hands forward (playing them out + advancing) until `handIndex` reaches `targetIndex` —
 * e.g. `advanceToHandIndex(rooms, 6)` fast-forwards through all 6 negative hands to reach the
 * first positive hand, so auction-specific tests don't have to re-derive that setup themselves. */
export async function advanceToHandIndex(rooms: TrackedRoom[], targetIndex: number): Promise<void> {
  while (rooms[0].envelope!.game.handIndex < targetIndex) {
    await playHandToComplete(rooms);
    await advanceHand(rooms);
  }
}

/** Plays a full 10-hand game to `"game-complete"` (always declaring trump directly on positive
 * hands — see `declareTrumpDirectly`). */
export async function playFullGame(rooms: TrackedRoom[]): Promise<void> {
  for (;;) {
    const phase = rooms[0].envelope!.game.phase;
    if (phase === "game-complete") return;
    if (phase === "hand-complete") {
      await advanceHand(rooms);
      continue;
    }
    await playHandToComplete(rooms);
  }
}
