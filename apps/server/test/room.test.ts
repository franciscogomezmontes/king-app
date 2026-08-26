import { boot, ColyseusTestServer } from "@colyseus/testing";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createGameServer } from "../src/gameServer";
import {
  advanceHand,
  advanceToHandIndex,
  closeAll,
  connectFourPlayers,
  playOneLegalCard,
  waitFor,
  waitForError,
} from "./helpers";

let colyseus: ColyseusTestServer;

beforeAll(async () => {
  // @colyseus/testing's boot() always binds its hardcoded port 2568 when given a Server instance
  // (a real bug in this version — the `port` argument only works with a ConfigOptions object
  // instead). vitest.config.ts forces test files to run sequentially so this doesn't collide with
  // fullGame.test.ts's own boot() call.
  colyseus = await boot(createGameServer());
});

afterAll(async () => {
  await colyseus.shutdown();
});

afterEach(async () => {
  await colyseus.cleanup();
});

describe("KingRoom — lifecycle", () => {
  it("assigns seats in join order and auto-deals once the 4th seat fills", async () => {
    const rooms = await connectFourPlayers(colyseus);
    for (const r of rooms) {
      await waitFor(r, (e) => e.game.phase === "playing");
      expect(r.envelope!.mySeat).toBe(r.seat);
      expect(r.envelope!.seatLabels[0]).toBe("Alice");
      expect(r.envelope!.seatLabels[3]).toBe("Deo");
    }
    // Hand 0 ("noTricks") is a negative hand — dealt straight into "playing", no trump-selection.
    expect(rooms[0].envelope!.game.handIndex).toBe(0);
    await closeAll(rooms);
  });

  it("rejects a 5th join once the room is full", async () => {
    const rooms = await connectFourPlayers(colyseus);
    await waitFor(rooms[0], (e) => e.game.phase === "playing");
    await expect(colyseus.sdk.joinById(rooms[0].room.roomId, { displayName: "Eve" })).rejects.toBeTruthy();
    await closeAll(rooms);
  });
});

describe("KingRoom — hand privacy (redaction)", () => {
  it("never sends another seat's actual cards, only a count", async () => {
    const rooms = await connectFourPlayers(colyseus);
    for (const r of rooms) await waitFor(r, (e) => e.game.phase === "playing");

    const seat0View = rooms[0].envelope!;
    expect(seat0View.game.hands[0]).toHaveLength(13);
    expect(seat0View.handSizes[0]).toBe(13);
    for (const otherSeat of [1, 2, 3] as const) {
      expect(seat0View.game.hands[otherSeat]).toEqual([]);
      expect(seat0View.handSizes[otherSeat]).toBe(13);
    }
    await closeAll(rooms);
  });
});

describe("KingRoom — action validation", () => {
  it("rejects a card played by anyone other than currentTurn, and leaves state unchanged", async () => {
    const rooms = await connectFourPlayers(colyseus);
    for (const r of rooms) await waitFor(r, (e) => e.game.phase === "playing");

    const currentTurn = rooms[0].envelope!.game.currentTurn;
    const notTurn = rooms.find((r) => r.seat !== currentTurn)!;
    const before = JSON.stringify(rooms[0].envelope);

    // notTurn's own hand is fully known to itself — send its own first card, illegal only because
    // it isn't their turn. There is no "player" field to spoof in the message at all (see
    // messages.ts) — the server always derives the actor from the connection, so the only way to
    // attempt an out-of-turn move is to have the wrong connection send it, which this does.
    const card = notTurn.envelope!.game.hands[notTurn.seat][0];
    notTurn.room.send("action", { type: "PLAY_CARD", card });

    const error = await waitForError(notTurn);
    expect(error.message).toMatch(/turn/i);
    // No broadcast should have gone out for a rejected action — state stays exactly as it was.
    expect(JSON.stringify(rooms[0].envelope)).toBe(before);
    await closeAll(rooms);
  });

  it("rejects REQUEST_REDEAL when the seat isn't eligible (has a face card)", async () => {
    const rooms = await connectFourPlayers(colyseus);
    for (const r of rooms) await waitFor(r, (e) => e.game.phase === "playing");

    // Hand 0 is a negative hand — noFaceCardsRedealEnabled only applies to positive hands, so
    // this is rejected regardless of what's actually in seat 0's hand.
    rooms[0].room.send("action", { type: "REQUEST_REDEAL" });
    const error = await waitForError(rooms[0]);
    expect(error.message.length).toBeGreaterThan(0);
    await closeAll(rooms);
  });

  it("two ADVANCE_HAND messages sent back-to-back cause exactly one transition, not a crash", async () => {
    const rooms = await connectFourPlayers(colyseus);
    for (const r of rooms) await waitFor(r, (e) => e.game.phase === "playing");

    // Play hand 0 out completely.
    while (rooms[0].envelope!.game.phase === "playing") {
      await playOneLegalCard(rooms);
    }
    await waitFor(rooms[0], (e) => e.game.phase === "hand-complete");

    rooms[0].room.send("action", { type: "ADVANCE_HAND" });
    rooms[1].room.send("action", { type: "ADVANCE_HAND" });

    await waitFor(rooms[0], (e) => e.game.handIndex === 1);
    // The second (redundant) ADVANCE_HAND should have been rejected with a clean error, not
    // corrupted anything — handIndex settles at exactly 1, never higher.
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(rooms[0].envelope!.game.handIndex).toBe(1);
    await closeAll(rooms);
  }, 20000);
});

describe("KingRoom — auction bid-turn order (server-enforced, rules-engine doesn't check this itself)", () => {
  it("rejects an out-of-turn bid and a premature dealer decision, accepts them in order", async () => {
    const rooms = await connectFourPlayers(colyseus);
    for (const r of rooms) await waitFor(r, (e) => e.game.phase === "playing");

    await advanceToHandIndex(rooms, 6); // fast-forward through all 6 negative hands
    expect(rooms[0].envelope!.game.handType).toBe("positive");

    const dealer = rooms[0].envelope!.game.dealer;
    const dealerRoom = rooms[dealer];
    const nonDealerSeats = ([0, 1, 2, 3] as const).filter((s) => s !== dealer);
    const firstBidder = (dealer + 1) % 4;

    dealerRoom.room.send("action", { type: "OPEN_AUCTION" });
    await waitFor(rooms[0], (e) => e.game.phase === "auction-bidding");

    // Wrong seat tries to bid first.
    const wrongBidder = nonDealerSeats.find((s) => s !== firstBidder)!;
    rooms[wrongBidder].room.send("action", { type: "SUBMIT_BID", tricks: 5 });
    const bidError = await waitForError(rooms[wrongBidder]);
    expect(bidError.message).toMatch(/turn/i);

    // Dealer tries to decide before anyone has bid.
    dealerRoom.room.send("action", { type: "DEALER_DECIDE", sell: true });
    const dealerError = await waitForError(dealerRoom);
    expect(dealerError.message.length).toBeGreaterThan(0);

    // Correct order: each non-dealer seat bids or passes in turn.
    for (const seat of [firstBidder, (firstBidder + 1) % 4, (firstBidder + 2) % 4] as const) {
      const before = rooms[0].envelope!.auctionTurn.passedSeats.length;
      rooms[seat].room.send("action", { type: "PASS_BID" });
      await waitFor(rooms[0], (e) => e.auctionTurn.passedSeats.length !== before);
    }

    dealerRoom.room.send("action", { type: "DEALER_DECIDE", sell: false });
    await waitFor(rooms[0], (e) => e.game.phase === "trump-selection");
    expect(rooms[0].envelope!.game.positiveSetup!.trumpNamer).toBe(dealer);

    await closeAll(rooms);
  }, 30000);
});
