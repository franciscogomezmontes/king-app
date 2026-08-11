import { describe, expect, it } from "vitest";
import { chooseBid, chooseCard, chooseDealerDecision, chooseTrumpDeclaration, shouldOpenAuction } from "ai-opponent";
import { GameRules, GameState, PlayerIndex } from "rules-engine";
import { createGameStore, Difficulty, pendingDecision } from "../src/game/store";

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

function sum(scores: Record<PlayerIndex, number>): number {
  return scores[0] + scores[1] + scores[2] + scores[3];
}

const HUMAN_SEAT: PlayerIndex = 0;

/**
 * Drives a full game through the store's own public API (playCard/declareTrump/openAuction/
 * submitBid/passBid/dealerDecide) — the same calls GameScreen makes — with seats 1-3 auto-played
 * internally by the store (per `difficulty`) and seat 0 ("human" here) driven externally using
 * ai-opponent, so this exercises the store's orchestration itself, not just the engine beneath it.
 *
 * The store paces bot decisions and trick-completion reveals with real delays for the live UI —
 * `botDelayMs: 0` disables all of that here so the test runs fast, and `waitForIdle()` is awaited
 * after every dispatch so state has fully settled (through any auto-played bot turns) before the
 * next iteration reads it.
 */
async function playFullGameViaStore(
  ruleSet: GameRules,
  difficulty: Difficulty,
  firstDealer: PlayerIndex,
  seed: number,
): Promise<GameState> {
  const random = mulberry32(seed);
  const store = createGameStore({ ruleSet, humanSeat: HUMAN_SEAT, difficulty, firstDealer, random, botDelayMs: 0 });
  await store.getState().waitForIdle(); // settle the initial deal (+ any pre-human bot turns)

  const { playCard, declareTrump, openAuction, submitBid, passBid, dealerDecide, continueToNextHand, waitForIdle } =
    store.getState();

  for (;;) {
    const { game, biddingIndex } = store.getState();
    const decision = pendingDecision(game, biddingIndex);
    if (decision.kind === "done") return game;
    if (decision.kind === "advance") {
      continueToNextHand();
      await waitForIdle();
      continue;
    }
    if (!("player" in decision) || decision.player !== HUMAN_SEAT) {
      throw new Error(`store should have auto-played this non-human decision: ${JSON.stringify(decision)}`);
    }

    switch (decision.kind) {
      case "trump": {
        if (decision.canOpenAuction && shouldOpenAuction(game, decision.player)) {
          openAuction();
        } else {
          declareTrump(chooseTrumpDeclaration(game, decision.player));
        }
        break;
      }
      case "bid": {
        const tricks = chooseBid(game, decision.player);
        if (tricks === null) passBid();
        else submitBid(tricks);
        break;
      }
      case "dealer-decide":
        dealerDecide(chooseDealerDecision(game, decision.player));
        break;
      case "play":
        playCard(chooseCard(game, decision.player));
        break;
    }
    await waitForIdle();
  }
}

describe("game store — full games via the public API", () => {
  const ruleSetCombos: GameRules[] = [
    { mandatoryKilling: false, auctionMustSell: false, playingDownEnabled: false, backwardsEnabled: false },
    { mandatoryKilling: true, auctionMustSell: true, playingDownEnabled: true, backwardsEnabled: true },
  ];

  for (const difficulty of ["easy", "normal"] as const) {
    it(`difficulty="${difficulty}": reaches game-complete with cumulative scores summing to exactly 0`, async () => {
      for (const ruleSet of ruleSetCombos) {
        for (let i = 0; i < 3; i++) {
          const firstDealer = (i % 4) as PlayerIndex;
          const seed = i * 104729 + 3;
          const final = await playFullGameViaStore(ruleSet, difficulty, firstDealer, seed);
          expect(final.phase).toBe("game-complete");
          expect(final.handHistory).toHaveLength(10);
          expect(sum(final.cumulativeScores)).toBe(0);
        }
      }
    });
  }
});
