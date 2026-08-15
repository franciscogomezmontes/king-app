import { boot, ColyseusTestServer } from "@colyseus/testing";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { PlayerIndex } from "rules-engine";
import { createGameServer } from "../src/gameServer";
import { closeAll, connectFourPlayers, playFullGame, waitFor } from "./helpers";

let colyseus: ColyseusTestServer;

beforeAll(async () => {
  // See room.test.ts for why this doesn't pass an explicit port.
  colyseus = await boot(createGameServer());
});

afterAll(async () => {
  await colyseus.shutdown();
});

afterEach(async () => {
  await colyseus.cleanup();
});

function sum(scores: Record<PlayerIndex, number>): number {
  return scores[0] + scores[1] + scores[2] + scores[3];
}

describe("KingRoom — full 10-hand game over the network", () => {
  it("reaches game-complete with cumulative scores summing to exactly 0, consistently across all 4 clients", async () => {
    const rooms = await connectFourPlayers(colyseus);
    for (const r of rooms) await waitFor(r, (e) => e.game.phase === "playing");

    await playFullGame(rooms);
    for (const r of rooms) await waitFor(r, (e) => e.game.phase === "game-complete");

    for (const r of rooms) {
      expect(r.envelope!.game.handHistory).toHaveLength(10);
      expect(sum(r.envelope!.game.cumulativeScores)).toBe(0);
    }

    // Every client's view of the final scores agrees — the whole point of a single authoritative
    // server, not four independently-computed local games.
    const [first, ...rest] = rooms;
    for (const r of rest) {
      expect(r.envelope!.game.cumulativeScores).toEqual(first.envelope!.game.cumulativeScores);
    }

    await closeAll(rooms);
  }, 60000);
});
