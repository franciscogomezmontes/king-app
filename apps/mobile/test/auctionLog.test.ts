import { describe, expect, it } from "vitest";
import { chooseBid, chooseCard, chooseDealerDecision, chooseTrumpDeclaration, shouldOpenAuction } from "ai-opponent";
import { DEFAULT_GAME_RULES, PlayerIndex } from "rules-engine";
import type { AuctionLogEntry } from "ui-kit";
import { createGameStore, pendingDecision } from "../src/game/store";

// Same small deterministic PRNG used throughout this repo's property/integration tests.
function mulberry32(seed: number) {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HUMAN_SEAT: PlayerIndex = 0;

/**
 * Drives a full game via the store's public API (same technique as store.test.ts's
 * driveStoreToCompletion) while subscribing to every store update, capturing `auctionLog` at the
 * exact moment each positive hand's auction resolves (phase flips away from "auction-bidding") —
 * this is the only point a completed auction's transcript is guaranteed both final and still
 * readable (the next hand's DEAL_HAND blanks it back to `[]`).
 */
async function collectAuctionLogs(seed: number): Promise<AuctionLogEntry[][]> {
  const random = mulberry32(seed);
  const store = createGameStore({
    ruleSet: DEFAULT_GAME_RULES,
    humanSeat: HUMAN_SEAT,
    difficulty: "easy",
    firstDealer: (seed % 4) as PlayerIndex,
    random,
    botDelayMs: 0,
  });

  const captured: AuctionLogEntry[][] = [];
  let lastPhase = "";
  const unsubscribe = store.subscribe((s) => {
    // A redeal mid-auction (a bot's hand has no face cards — see autoPlay/canRequestRedeal) also
    // leaves "auction-bidding" but blanks auctionLog back to `[]` (RESETS_AUCTION_LOG) rather than
    // resolving it — only a genuine dealer decision leaves a non-empty transcript behind.
    if (lastPhase === "auction-bidding" && s.game.phase !== "auction-bidding" && s.auctionLog.length > 0) {
      captured.push(s.auctionLog);
    }
    lastPhase = s.game.phase;
  });

  await store.getState().waitForIdle();
  for (;;) {
    const { game, auctionTurn } = store.getState();
    const decision = pendingDecision(game, auctionTurn);
    if (decision.kind === "done") break;
    if (decision.kind === "advance") {
      store.getState().continueToNextHand();
      await store.getState().waitForIdle();
      continue;
    }
    if (!("player" in decision) || decision.player !== HUMAN_SEAT) {
      throw new Error(`store should have auto-played this non-human decision: ${JSON.stringify(decision)}`);
    }
    switch (decision.kind) {
      case "trump":
        if (decision.canOpenAuction && shouldOpenAuction(game, decision.player)) store.getState().openAuction();
        else store.getState().declareTrump(chooseTrumpDeclaration(game, decision.player));
        break;
      case "bid": {
        const tricks = chooseBid(game, decision.player);
        if (tricks === null) store.getState().passBid();
        else store.getState().submitBid(tricks);
        break;
      }
      case "dealer-decide":
        store.getState().dealerDecide(chooseDealerDecision(game, decision.player));
        break;
      case "play":
        store.getState().playCard(chooseCard(game, decision.player));
        break;
    }
    await store.getState().waitForIdle();
  }
  unsubscribe();
  return captured;
}

describe("game store — auction transcript", () => {
  it("records a chronologically consistent open/bid/pass/decide log for every auctioned positive hand", async () => {
    const allLogs: AuctionLogEntry[][] = [];
    for (let seed = 0; seed < 8; seed++) {
      allLogs.push(...(await collectAuctionLogs(seed * 104729 + 7)));
    }

    // Across 8 full games (4 positive hands each), at least a handful of hands should have actually
    // opened an auction — otherwise this test would be silently asserting nothing.
    expect(allLogs.length).toBeGreaterThan(0);

    for (const log of allLogs) {
      expect(log.length).toBeGreaterThan(0);
      expect(log[0].type).toBe("open");
      expect(log[log.length - 1].type).toBe("decide");

      // Bids strictly increase (rules-engine's own submitBid invariant, mirrored here).
      const bids = log.filter((e): e is Extract<AuctionLogEntry, { type: "bid" }> => e.type === "bid");
      for (let i = 1; i < bids.length; i++) {
        expect(bids[i].tricks).toBeGreaterThan(bids[i - 1].tricks);
      }

      // Once a seat passes, it's out for the rest of this auction — matches the "matches Francisco's
      // own example" turn-order tests in auctionOrder.test.ts, exercised here through the whole store.
      const passed = new Set<PlayerIndex>();
      for (const entry of log) {
        if (entry.type === "bid" || entry.type === "pass") {
          expect(passed.has(entry.player)).toBe(false);
        }
        if (entry.type === "pass") passed.add(entry.player);
      }

      // The final "decide" entry's tricks match whichever bid was actually the standing high one.
      const decide = log[log.length - 1] as Extract<AuctionLogEntry, { type: "decide" }>;
      const highest = bids.length > 0 ? Math.max(...bids.map((b) => b.tricks)) : 0;
      expect(decide.tricks).toBe(highest);
    }
  });
});
