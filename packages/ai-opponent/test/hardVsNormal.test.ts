import { describe, expect, it } from "vitest";
import { applyAction, createDeck, createGame, GameRules, GameState, PlayerIndex, shuffle } from "rules-engine";
import {
  chooseBid,
  chooseCard,
  chooseDealerDecision,
  chooseTrumpDeclaration,
  Difficulty,
  ismctsChooseCard,
  shouldOpenAuction,
} from "../src";

// Same small deterministic PRNG used throughout this package's other bot-vs-bot tests.
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

const ALL_SEATS: PlayerIndex[] = [0, 1, 2, 3];
const SEARCH_SEAT: PlayerIndex = 0;

// A production-length ISMCTS budget (HARD_BUDGET_MS, ~250ms) times the ~130 card decisions one
// seat makes across a 10-hand game, times enough games for a stable comparison, would take this
// test many minutes. The algorithm's effectiveness scales with search budget, not with which
// specific budget is used, so a much smaller one here still exercises the exact same tree/rollout/
// backprop machinery in production, just with fewer iterations per decision — proving the
// mechanism works is the point of this test, not reproducing the production budget.
const TEST_SEARCH_BUDGET_MS = 15;

/**
 * Plays one full 10-hand game with `searchSeatDifficulty` controlling seat 0's card play (via
 * ismctsChooseCard directly when it's "hard", so the test-scoped budget above applies instead of
 * the production HARD_BUDGET_MS) and every other seat always at "normal". Every other decision
 * (trump, auction, dealer) always uses this package's plain defaults for every seat, isolating the
 * comparison to card-play quality specifically.
 *
 * Deals are driven by their own PRNG (`dealRandom`), entirely separate from the one handed to
 * ismctsChooseCard (`searchRandom`) — ISMCTS consumes a variable, potentially large number of
 * random draws per decision (determinization sampling, tie-breaking) that has nothing to do with
 * how many draws "normal" play would have consumed at the same point. Sharing one PRNG between
 * them would desync every deal from hand 2 onward the moment the two conditions' random-draw
 * counts first diverge, silently breaking the "same seed -> same deals" comparison this test
 * depends on.
 */
function playFullGame(
  ruleSet: GameRules,
  firstDealer: PlayerIndex,
  seed: number,
  searchSeatDifficulty: Difficulty,
): GameState {
  const dealRandom = mulberry32(seed);
  const searchRandom = mulberry32(seed + 1_000_000_000);
  let state: GameState = createGame(ruleSet, firstDealer);

  while (state.phase !== "game-complete") {
    switch (state.phase) {
      case "awaiting-deal": {
        const deck = shuffle(createDeck(), dealRandom);
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
        const card =
          player === SEARCH_SEAT && searchSeatDifficulty === "hard"
            ? ismctsChooseCard(state, player, TEST_SEARCH_BUDGET_MS, searchRandom)
            : chooseCard(state, player, "normal");
        state = applyAction(state, { type: "PLAY_CARD", player, card });
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

describe("hard vs. normal — full-game score comparison", () => {
  it("seat 0 scores measurably better at \"hard\" than at \"normal\", across the same deals, all else equal", () => {
    const ruleSet: GameRules = {
      mandatoryKilling: false,
      auctionMustSell: false,
      playingDownEnabled: false,
      backwardsEnabled: false,
      noFaceCardsRedealEnabled: false,
    };

    const GAMES = 20;
    let normalTotal = 0;
    let hardTotal = 0;

    for (let i = 0; i < GAMES; i++) {
      const firstDealer = (i % 4) as PlayerIndex;
      const seed = i * 104729 + 31;
      // Same seed for both conditions — same deals, same auction/trump outcomes up to the point
      // seat 0's own card choices start to diverge — isolating card-play skill as the one
      // difference between the two runs.
      const normalGame = playFullGame(ruleSet, firstDealer, seed, "normal");
      const hardGame = playFullGame(ruleSet, firstDealer, seed, "hard");
      normalTotal += normalGame.cumulativeScores[SEARCH_SEAT];
      hardTotal += hardGame.cumulativeScores[SEARCH_SEAT];
    }

    const normalAverage = normalTotal / GAMES;
    const hardAverage = hardTotal / GAMES;

    expect(hardAverage).toBeGreaterThan(normalAverage);
  }, 120_000);
});
