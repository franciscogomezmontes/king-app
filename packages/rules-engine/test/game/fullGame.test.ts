import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { highestBid } from "../../src/auction";
import { createDeck, shuffle } from "../../src/deck";
import { applyAction, legalCardsFor } from "../../src/game/actions";
import { rotateLeftEachHand } from "../../src/game/dealer";
import { createGame, GameRules, GameState } from "../../src/game/state";
import { PlayerIndex, SUITS } from "../../src/types";

// Same small deterministic PRNG as scoring.test.ts's buildHandResult, so property-test failures
// reproduce from the seed alone.
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

function sum(scores: Record<PlayerIndex, number>): number {
  return scores[0] + scores[1] + scores[2] + scores[3];
}

function otherSeats(exclude: PlayerIndex): PlayerIndex[] {
  return ([0, 1, 2, 3] as PlayerIndex[]).filter((p) => p !== exclude);
}

/**
 * Drives a full 10-hand game to completion via applyAction, making random-but-always-legal
 * choices at every decision point (never anything `legalPlays`/the action guards would reject).
 * Since it's already walking every state transition, it also asserts the trick-leader and
 * dealer-rotation invariants along the way rather than just at the end.
 */
function driveFullGame(ruleSet: GameRules, firstDealer: PlayerIndex, seed: number): GameState {
  const random = mulberry32(seed);
  let state = createGame(ruleSet, firstDealer);

  while (state.phase !== "game-complete") {
    switch (state.phase) {
      case "awaiting-deal": {
        expect(state.dealer).toBe(rotateLeftEachHand(state.handIndex, state.firstDealer));
        const deck = shuffle(createDeck(), random);
        state = applyAction(state, { type: "DEAL_HAND", deck });
        break;
      }

      case "trump-selection": {
        const setup = state.positiveSetup!;
        const canOpenAuction = setup.trumpNamer === state.dealer && !setup.auctionOpened;
        if (canOpenAuction && random() < 0.5) {
          state = applyAction(state, { type: "OPEN_AUCTION", player: state.dealer });
        } else {
          const trumpOptions = [null, ...SUITS];
          const trump = trumpOptions[Math.floor(random() * trumpOptions.length)];
          const direction = state.ruleSet.playingDownEnabled && random() < 0.5 ? "down" : "up";
          const backwards = state.ruleSet.backwardsEnabled && random() < 0.5;
          state = applyAction(state, {
            type: "DECLARE_TRUMP",
            player: setup.trumpNamer,
            trump,
            direction,
            backwards,
          });
        }
        break;
      }

      case "auction-bidding": {
        const currentHigh = highestBid(state.positiveSetup!.bids)?.tricks ?? 0;
        if (currentHigh < 13 && random() < 0.6) {
          const others = otherSeats(state.dealer);
          const bidder = others[Math.floor(random() * others.length)];
          const tricks = currentHigh + 1 + Math.floor(random() * (13 - currentHigh));
          state = applyAction(state, { type: "SUBMIT_BID", player: bidder, tricks });
        } else {
          const sell = random() < 0.5;
          state = applyAction(state, { type: "DEALER_DECIDE", player: state.dealer, sell });
        }
        break;
      }

      case "playing": {
        const player = state.currentTurn;
        const legal = legalCardsFor(state, player);
        const card = legal[Math.floor(random() * legal.length)];
        const tricksBefore = state.completedTricks.length;
        state = applyAction(state, { type: "PLAY_CARD", player, card });
        if (state.phase === "playing" && state.completedTricks.length === tricksBefore + 1) {
          const justCompleted = state.completedTricks[state.completedTricks.length - 1];
          expect(state.currentTurn).toBe(justCompleted.winner);
        }
        break;
      }

      case "hand-complete": {
        state = applyAction(state, { type: "ADVANCE_HAND" });
        break;
      }
    }
  }

  return state;
}

describe("full 10-hand game — zero-sum invariant", () => {
  it("cumulative scores always sum to exactly 0 at game-complete, across a sweep of GameRules", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 2 ** 31 - 1 }),
        fc.integer({ min: 0, max: 3 }),
        fc.record({
          mandatoryKilling: fc.boolean(),
          auctionMustSell: fc.boolean(),
          playingDownEnabled: fc.boolean(),
          backwardsEnabled: fc.boolean(),
        }),
        (seed, firstDealer, ruleSet) => {
          const final = driveFullGame(ruleSet, firstDealer as PlayerIndex, seed);
          expect(final.phase).toBe("game-complete");
          expect(final.handHistory).toHaveLength(10);
          expect(sum(final.cumulativeScores)).toBe(0);
        },
      ),
      { numRuns: 60 },
    );
  });
});
