import { describe, expect, it } from "vitest";
import { applyAction, createDeck, createGame, GameRules, GameState, PlayerIndex, shuffle } from "rules-engine";
import { chooseBid, chooseCard, chooseDealerDecision, chooseTrumpDeclaration, shouldOpenAuction } from "../src";

// Same small deterministic PRNG used throughout rules-engine's property tests, so a failure
// reproduces from the seed alone.
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

const ALL_SEATS: PlayerIndex[] = [0, 1, 2, 3];

/**
 * Drives a full 10-hand game to completion via applyAction, with every decision — trump/auction
 * setup, bidding, dealer accept/decline, and every card played — made by this package's own AI
 * functions. Per .claude/skills/king-ai-opponent's testing guidance, reaching game-complete at
 * all is itself proof every AI-chosen move was legal: applyAction throws on anything illegal.
 */
function playFullGame(ruleSet: GameRules, firstDealer: PlayerIndex, seed: number): GameState {
  const random = mulberry32(seed);
  let state = createGame(ruleSet, firstDealer);

  while (state.phase !== "game-complete") {
    switch (state.phase) {
      case "awaiting-deal": {
        const deck = shuffle(createDeck(), random);
        state = applyAction(state, { type: "DEAL_HAND", deck });
        break;
      }

      case "trump-selection": {
        const setup = state.positiveSetup!;
        const dealerMayOpen = setup.trumpNamer === state.dealer && !setup.auctionOpened;
        if (dealerMayOpen && shouldOpenAuction(state, state.dealer)) {
          state = applyAction(state, { type: "OPEN_AUCTION", player: state.dealer });
        } else {
          const declaration = chooseTrumpDeclaration(state, setup.trumpNamer);
          state = applyAction(state, {
            type: "DECLARE_TRUMP",
            player: setup.trumpNamer,
            trump: declaration.trump,
            direction: declaration.direction,
            backwards: declaration.backwards,
          });
        }
        break;
      }

      case "auction-bidding": {
        const others = ALL_SEATS.filter((p) => p !== state.dealer);
        const bidder = others.find((p) => chooseBid(state, p) !== null);
        if (bidder !== undefined) {
          state = applyAction(state, { type: "SUBMIT_BID", player: bidder, tricks: chooseBid(state, bidder)! });
        } else {
          state = applyAction(state, {
            type: "DEALER_DECIDE",
            player: state.dealer,
            sell: chooseDealerDecision(state, state.dealer),
          });
        }
        break;
      }

      case "playing": {
        const player = state.currentTurn;
        state = applyAction(state, { type: "PLAY_CARD", player, card: chooseCard(state, player) });
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

describe("bot vs. bot — full games", () => {
  const ruleSetCombos: GameRules[] = [
    { mandatoryKilling: false, auctionMustSell: false, playingDownEnabled: false, backwardsEnabled: false },
    { mandatoryKilling: true, auctionMustSell: false, playingDownEnabled: false, backwardsEnabled: false },
    { mandatoryKilling: false, auctionMustSell: true, playingDownEnabled: true, backwardsEnabled: true },
  ];

  it("always reaches game-complete with cumulative scores summing to exactly 0", () => {
    for (const ruleSet of ruleSetCombos) {
      for (let i = 0; i < 5; i++) {
        const firstDealer = (i % 4) as PlayerIndex;
        const seed = i * 7919 + 1;
        const final = playFullGame(ruleSet, firstDealer, seed);
        expect(final.phase).toBe("game-complete");
        expect(final.handHistory).toHaveLength(10);
        expect(sum(final.cumulativeScores)).toBe(0);
      }
    }
  });
});
