import { describe, expect, it } from "vitest";
import { applyAction, createDeck, createGame, GameRules, GameState, PlayerIndex, shuffle } from "rules-engine";
import {
  chooseBid,
  chooseCard,
  chooseDealerDecision,
  chooseTrumpDeclaration,
  Difficulty,
  shouldOpenAuction,
} from "../src";

// Same small deterministic PRNG used throughout rules-engine's property tests and this package's
// other bot-vs-bot test, so a failure reproduces from the seed alone.
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

interface LeadStats {
  /** Positive-hand tricks led (by anyone) and observed to completion. */
  ledTricks: number;
  /** Of those, how many the leader themselves went on to win. */
  leaderWon: number;
}

/**
 * Drives a full 10-hand game exactly like this package's other bot-vs-bot test, except every
 * `chooseCard` call uses `cardDifficulty` (bidding/trump/dealer decisions stay the package's
 * plain default — this isolates the comparison to card-leading behavior specifically) and tracks,
 * for positive hands only, how often the player who *led* a trick went on to *win* that same
 * trick. That rate is the direct, measurable signature of the leading heuristic's quality: a
 * smarter lead (a proven master card, drawing trump with real length, avoiding a suit opponents
 * have already shown void in) should win its own trick more often than a lead that only looks at
 * raw card rank.
 */
function playAndTrackLeading(
  ruleSet: GameRules,
  firstDealer: PlayerIndex,
  seed: number,
  cardDifficulty: Difficulty,
  cardRandom: () => number,
): LeadStats {
  const random = mulberry32(seed);
  let state: GameState = createGame(ruleSet, firstDealer);
  const stats: LeadStats = { ledTricks: 0, leaderWon: 0 };
  let pendingLeader: PlayerIndex | null = null;

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
        const isPositive = state.handType === "positive";
        if (state.currentTrick.length === 0) pendingLeader = player;
        const tricksBefore = state.completedTricks.length;

        state = applyAction(state, {
          type: "PLAY_CARD",
          player,
          card: chooseCard(state, player, cardDifficulty, cardRandom),
        });

        if (isPositive && pendingLeader !== null && state.completedTricks.length === tricksBefore + 1) {
          stats.ledTricks += 1;
          if (state.completedTricks[state.completedTricks.length - 1].winner === pendingLeader) {
            stats.leaderWon += 1;
          }
          pendingLeader = null;
        }
        break;
      }

      case "hand-complete": {
        state = applyAction(state, { type: "ADVANCE_HAND" });
        break;
      }
    }
  }

  return stats;
}

function accumulate(a: LeadStats, b: LeadStats): LeadStats {
  return { ledTricks: a.ledTricks + b.ledTricks, leaderWon: a.leaderWon + b.leaderWon };
}

describe("difficulty comparison — leading quality", () => {
  it('"normal" (card-tracking-aware leads) wins more of its own led positive-hand tricks than the old, pre-tracking heuristic, across the same deals', () => {
    const ruleSet: GameRules = {
      mandatoryKilling: false,
      auctionMustSell: false,
      playingDownEnabled: false,
      backwardsEnabled: false,
    };
    // Forces "easy" to never take its random branch, so it's exactly today's shipped heuristic —
    // the fair baseline to improve on, not a noisier strawman.
    const neverRandom = () => 1;

    let oldStats: LeadStats = { ledTricks: 0, leaderWon: 0 };
    let normalStats: LeadStats = { ledTricks: 0, leaderWon: 0 };

    const SAMPLES = 60;
    for (let i = 0; i < SAMPLES; i++) {
      const firstDealer = (i % 4) as PlayerIndex;
      const seed = i * 104729 + 17;
      // Same seed for both — same deals for both, in a full head-to-head with itself (each group
      // is 4 seats of that one difficulty), isolating the leading heuristic as the only variable.
      oldStats = accumulate(oldStats, playAndTrackLeading(ruleSet, firstDealer, seed, "easy", neverRandom));
      normalStats = accumulate(normalStats, playAndTrackLeading(ruleSet, firstDealer, seed, "normal", neverRandom));
    }

    // Sanity: enough positive-hand tricks were actually sampled for the comparison to mean
    // anything (4 positive hands/game x 13 tricks x 60 games = up to 3120 possible).
    expect(oldStats.ledTricks).toBeGreaterThan(500);
    expect(normalStats.ledTricks).toBeGreaterThan(500);

    const oldRate = oldStats.leaderWon / oldStats.ledTricks;
    const normalRate = normalStats.leaderWon / normalStats.ledTricks;

    expect(normalRate).toBeGreaterThan(oldRate);
  });
});
