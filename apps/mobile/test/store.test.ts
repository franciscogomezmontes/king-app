import { describe, expect, it } from "vitest";
import { chooseBid, chooseCard, chooseDealerDecision, chooseTrumpDeclaration, shouldOpenAuction } from "ai-opponent";
import { applyAction, createDeck, createGame, DEFAULT_GAME_RULES, GameRules, GameState, PlayerIndex, shuffle } from "rules-engine";
import { createGameStore, Difficulty, pendingDecision, resumeGameStore } from "../src/game/store";

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
 * Drives an already-constructed store through to game-complete via its own public API
 * (playCard/declareTrump/openAuction/submitBid/passBid/dealerDecide) — the same calls GameScreen
 * makes — with seats 1-3 auto-played internally by the store and seat 0 ("human" here) driven
 * externally using ai-opponent, so this exercises the store's orchestration itself, not just the
 * engine beneath it. Shared by both a freshly-dealt store and one resumed from a saved session —
 * from here on, driving either to completion looks identical, which is the point.
 *
 * The store paces bot decisions and trick-completion reveals with real delays for the live UI —
 * tests must pass `botDelayMs: 0` when constructing the store to disable all of that so this runs
 * fast; `waitForIdle()` is awaited after every dispatch so state has fully settled (through any
 * auto-played bot turns) before the next iteration reads it.
 */
async function driveStoreToCompletion(store: ReturnType<typeof createGameStore>): Promise<GameState> {
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

async function playFullGameViaStore(
  ruleSet: GameRules,
  difficulty: Difficulty,
  firstDealer: PlayerIndex,
  seed: number,
): Promise<GameState> {
  const random = mulberry32(seed);
  const store = createGameStore({ ruleSet, humanSeat: HUMAN_SEAT, difficulty, firstDealer, random, botDelayMs: 0 });
  return driveStoreToCompletion(store);
}

describe("game store — resuming a saved session", () => {
  it("restores the exact saved game state rather than dealing fresh", () => {
    const random = mulberry32(5);
    let game: GameState = createGame(DEFAULT_GAME_RULES, 0);
    game = applyAction(game, { type: "DEAL_HAND", deck: shuffle(createDeck(), random) });
    // Play a few cards so the saved state is demonstrably mid-hand, not a fresh deal.
    for (let i = 0; i < 3; i++) {
      const player = game.currentTurn;
      game = applyAction(game, { type: "PLAY_CARD", player, card: chooseCard(game, player) });
    }
    const savedHands = JSON.parse(JSON.stringify(game.hands));
    const savedCurrentTrick = JSON.parse(JSON.stringify(game.currentTrick));

    const store = resumeGameStore({ game, humanSeat: HUMAN_SEAT, difficulty: "easy", botRosterIndices: [0, 1, 2], biddingIndex: 0 }, { botDelayMs: 0 });

    // Read synchronously, right after construction — zustand's create() runs its initializer
    // synchronously, so this is the state before any auto-play continuation has had a chance to
    // run yet, proving it started from the saved session and not a fresh deal.
    expect(store.getState().game.hands).toEqual(savedHands);
    expect(store.getState().game.currentTrick).toEqual(savedCurrentTrick);
    expect(store.getState().humanSeat).toBe(HUMAN_SEAT);
    expect(store.getState().difficulty).toBe("easy");
  });

  it("a resumed game can still be driven all the way to game-complete", async () => {
    const random = mulberry32(6);
    let game: GameState = createGame(DEFAULT_GAME_RULES, 0);
    game = applyAction(game, { type: "DEAL_HAND", deck: shuffle(createDeck(), random) });

    const store = resumeGameStore(
      { game, humanSeat: HUMAN_SEAT, difficulty: "easy", botRosterIndices: [0, 1, 2], biddingIndex: 0 },
      { random, botDelayMs: 0 },
    );
    const final = await driveStoreToCompletion(store);

    expect(final.phase).toBe("game-complete");
    expect(final.handHistory).toHaveLength(10);
  });
});

describe("game store — trick-reveal pacing", () => {
  it("keeps showing a hand-ending trick's 4 cards (phase still \"playing\") before flipping to hand-complete", async () => {
    const ruleSet: GameRules = {
      mandatoryKilling: false,
      auctionMustSell: false,
      playingDownEnabled: false,
      backwardsEnabled: false,
      noFaceCardsRedealEnabled: false,
    };
    const random = mulberry32(11);
    // botDelayMs: 0 skips the real pause (irrelevant to this test) but still reports the
    // intermediate "reveal" state as its own separate store update — this is regression coverage
    // for the store correctly deferring the phase flip until after that update, not for the pause
    // actually lasting any particular duration.
    const store = createGameStore({ ruleSet, humanSeat: HUMAN_SEAT, difficulty: "normal", firstDealer: 0, random, botDelayMs: 0 });
    await store.getState().waitForIdle();

    const snapshots: { phase: GameState["phase"]; displayTrickLength: number }[] = [];
    const unsubscribe = store.subscribe((state) => {
      snapshots.push({ phase: state.game.phase, displayTrickLength: state.displayTrick.length });
    });

    // Hand 1 is always a negative hand (fixed order), so every decision here is just "play" — play
    // through its 13 tricks until the hand completes.
    for (;;) {
      const { game, biddingIndex } = store.getState();
      const decision = pendingDecision(game, biddingIndex);
      if (decision.kind === "advance") break;
      if (decision.kind !== "play" || decision.player !== HUMAN_SEAT) {
        throw new Error(`unexpected decision during a negative hand: ${JSON.stringify(decision)}`);
      }
      store.getState().playCard(chooseCard(game, decision.player));
      await store.getState().waitForIdle();
    }
    unsubscribe();

    // The reveal update specifically for the hand's LAST trick: all 4 cards showing, immediately
    // followed by the update that actually flips to hand-complete. Every earlier (mid-hand) trick
    // also gets a 4-card reveal update, so this must specifically find the one right before the
    // hand-complete transition, not just the first reveal in the whole hand.
    const revealIndex = snapshots.findIndex(
      (s, i) => s.displayTrickLength === 4 && s.phase !== "hand-complete" && snapshots[i + 1]?.phase === "hand-complete",
    );
    expect(revealIndex).toBeGreaterThanOrEqual(0);
    // The bug this guards against: that reveal update instead already reporting "hand-complete",
    // which skips straight past the live table to the scoreboard in the same instant.
    expect(snapshots[revealIndex].phase).toBe("playing");
  });
});

describe("game store — full games via the public API", () => {
  const ruleSetCombos: GameRules[] = [
    {
      mandatoryKilling: false,
      auctionMustSell: false,
      playingDownEnabled: false,
      backwardsEnabled: false,
      noFaceCardsRedealEnabled: false,
    },
    {
      mandatoryKilling: true,
      auctionMustSell: true,
      playingDownEnabled: true,
      backwardsEnabled: true,
      noFaceCardsRedealEnabled: true,
    },
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
