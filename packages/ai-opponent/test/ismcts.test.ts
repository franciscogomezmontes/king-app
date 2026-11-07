import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  applyAction,
  Card,
  createDeck,
  createGame,
  DEFAULT_GAME_RULES,
  GameState,
  legalCardsFor,
  PlayerIndex,
  RandomSource,
  shuffle,
} from "rules-engine";
import { ismctsChooseCard } from "../src/ismcts";

// Same small deterministic PRNG used throughout this repo's property/integration tests.
function mulberry32(seed: number): RandomSource {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ALL_SEATS: PlayerIndex[] = [0, 1, 2, 3];

/**
 * Drives a game with every decision (deal, trump/auction setup, card play, hand advance) picked
 * uniformly at random from whatever's legal, stopping after `stopAfterPlays` PLAY_CARD actions (or
 * sooner, if the game reaches game-complete first) — covers a wide spread of hand types, trick
 * positions, and trump setups without needing to special-case any of them.
 */
function randomlyDrivenState(seed: number, stopAfterPlays: number): GameState {
  const random = mulberry32(seed);
  let state: GameState = createGame(DEFAULT_GAME_RULES, 0);
  let plays = 0;

  while (state.phase !== "game-complete" && plays < stopAfterPlays) {
    switch (state.phase) {
      case "awaiting-deal": {
        state = applyAction(state, { type: "DEAL_HAND", deck: shuffle(createDeck(), random) });
        break;
      }
      case "trump-selection": {
        const setup = state.positiveSetup!;
        const dealerMayOpen = setup.trumpNamer === state.dealer && !setup.auctionOpened;
        if (dealerMayOpen && random() < 0.3) {
          state = applyAction(state, { type: "OPEN_AUCTION", player: state.dealer });
        } else {
          const suits: (Card["suit"] | null)[] = [null, "S", "H", "D", "C"];
          state = applyAction(state, {
            type: "DECLARE_TRUMP",
            player: setup.trumpNamer,
            trump: suits[Math.floor(random() * suits.length)],
            direction: state.ruleSet.playingDownEnabled && random() < 0.3 ? "down" : "up",
            backwards: state.ruleSet.backwardsEnabled && random() < 0.3,
          });
        }
        break;
      }
      case "auction-bidding": {
        if (random() < 0.6) {
          state = applyAction(state, { type: "DEALER_DECIDE", player: state.dealer, sell: random() < 0.5 });
        } else {
          const bidder = ALL_SEATS.filter((p) => p !== state.dealer)[Math.floor(random() * 3)];
          state = applyAction(state, { type: "SUBMIT_BID", player: bidder, tricks: 1 + Math.floor(random() * 13) });
        }
        break;
      }
      case "playing": {
        const player = state.currentTurn;
        const legal = legalCardsFor(state, player);
        state = applyAction(state, { type: "PLAY_CARD", player, card: legal[Math.floor(random() * legal.length)] });
        plays += 1;
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

describe("ismctsChooseCard — legality", () => {
  it("always returns a legal card, across random game states and random (including near-zero) time budgets", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 2 ** 31 - 1 }),
        fc.integer({ min: 1, max: 60 }), // how many card plays to randomly advance before testing
        fc.integer({ min: 0, max: 30 }), // search budget in ms — 0 covers "search never completes an iteration"
        (seed, stopAfterPlays, budgetMs) => {
          const state = randomlyDrivenState(seed, stopAfterPlays);
          if (state.phase !== "playing") return; // landed on hand-complete/game-complete this run — nothing to search
          const player = state.currentTurn;
          const legal = legalCardsFor(state, player);

          const card = ismctsChooseCard(state, player, budgetMs, mulberry32(seed + 1));

          expect(legal.some((c) => c.suit === card.suit && c.rank === card.rank)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("with a real zero-length budget, still returns a legal card via the Tier 1 fallback", () => {
    const random = mulberry32(42);
    let state: GameState = createGame(DEFAULT_GAME_RULES, 0);
    state = applyAction(state, { type: "DEAL_HAND", deck: shuffle(createDeck(), random) });
    const player = state.currentTurn;
    const legal = legalCardsFor(state, player);

    const card = ismctsChooseCard(state, player, 0, random);

    expect(legal.some((c) => c.suit === card.suit && c.rank === card.rank)).toBe(true);
  });
});
