import { describe, expect, it } from "vitest";
import { createDeck } from "../../src/deck";
import {
  advanceHand,
  declareTrump,
  dealHand,
  legalCardsFor,
  openAuction,
  playCard,
  resolveDealerDecision,
  submitBid,
} from "../../src/game/actions";
import { createGame, DEFAULT_GAME_RULES, GameRules, GameState, PositiveHandSetup } from "../../src/game/state";
import { Card, PlayerIndex, Trick } from "../../src/types";

const rulesWith = (overrides: Partial<GameRules>): GameRules => ({ ...DEFAULT_GAME_RULES, ...overrides });

function withPositiveHand(state: GameState, overrides: Partial<PositiveHandSetup> = {}): GameState {
  return {
    ...state,
    handType: "positive",
    positiveSetup: {
      trumpNamer: state.dealer,
      trump: null,
      direction: "up",
      backwards: false,
      auctionOpened: false,
      bids: [],
      auction: null,
      ...overrides,
    },
  };
}

function dummyTrick(winner: PlayerIndex): Trick {
  return {
    plays: [
      { player: 0, card: { suit: "C", rank: 2 } },
      { player: 1, card: { suit: "C", rank: 3 } },
      { player: 2, card: { suit: "C", rank: 4 } },
      { player: 3, card: { suit: "C", rank: 5 } },
    ],
    winner,
  };
}

describe("dealHand", () => {
  it("negative hand: deals 13 cards each and moves straight into 'playing', led by the seat after the dealer", () => {
    const state = dealHand(createGame(DEFAULT_GAME_RULES, 0), createDeck());
    expect(state.phase).toBe("playing");
    expect(state.positiveSetup).toBeNull();
    for (const player of [0, 1, 2, 3] as PlayerIndex[]) expect(state.hands[player]).toHaveLength(13);
    expect(state.currentTurn).toBe(1); // seatAfterDealer(0)
  });

  it("positive hand: moves into 'trump-selection' with the dealer as trump-namer", () => {
    let state = createGame(DEFAULT_GAME_RULES, 2);
    state = { ...state, handIndex: 6, handType: "positive" };
    state = dealHand(state, createDeck());
    expect(state.phase).toBe("trump-selection");
    expect(state.positiveSetup?.trumpNamer).toBe(2);
    expect(state.positiveSetup?.trump).toBeNull();
  });

  it("throws if not awaiting-deal", () => {
    const dealt = dealHand(createGame(DEFAULT_GAME_RULES, 0), createDeck());
    expect(() => dealHand(dealt, createDeck())).toThrow();
  });
});

describe("declareTrump", () => {
  const base = () => withPositiveHand({ ...createGame(DEFAULT_GAME_RULES, 0), phase: "trump-selection" });

  it("names trump and moves to 'playing'", () => {
    const state = declareTrump(base(), 0, "S", "up", false);
    expect(state.phase).toBe("playing");
    expect(state.positiveSetup?.trump).toBe("S");
    expect(state.currentTurn).toBe(1); // seatAfterDealer(0)
  });

  it("throws if the player isn't the trump-namer", () => {
    expect(() => declareTrump(base(), 1, "S", "up", false)).toThrow();
  });

  it("throws if not in trump-selection", () => {
    expect(() => declareTrump({ ...base(), phase: "playing" }, 0, "S", "up", false)).toThrow();
  });

  it("rejects 'down' when playingDownEnabled is off, accepts it when on", () => {
    expect(() => declareTrump(base(), 0, "S", "down", false)).toThrow();
    const enabled = { ...base(), ruleSet: rulesWith({ playingDownEnabled: true }) };
    expect(() => declareTrump(enabled, 0, "S", "down", false)).not.toThrow();
  });

  it("rejects backwards when backwardsEnabled is off, accepts it when on", () => {
    expect(() => declareTrump(base(), 0, "S", "up", true)).toThrow();
    const enabled = { ...base(), ruleSet: rulesWith({ backwardsEnabled: true }) };
    expect(() => declareTrump(enabled, 0, "S", "up", true)).not.toThrow();
  });
});

describe("openAuction", () => {
  const base = () => withPositiveHand({ ...createGame(DEFAULT_GAME_RULES, 0), phase: "trump-selection" });

  it("moves to 'auction-bidding'", () => {
    const state = openAuction(base(), 0);
    expect(state.phase).toBe("auction-bidding");
    expect(state.positiveSetup?.auctionOpened).toBe(true);
  });

  it("throws if not opened by the dealer", () => {
    expect(() => openAuction(base(), 1)).toThrow();
  });

  it("throws if an auction was already opened this hand", () => {
    const opened = openAuction(base(), 0);
    const backInSelection = { ...opened, phase: "trump-selection" as const };
    expect(() => openAuction(backInSelection, 0)).toThrow();
  });
});

describe("submitBid", () => {
  const base = () =>
    withPositiveHand(
      { ...createGame(DEFAULT_GAME_RULES, 0), phase: "auction-bidding" },
      { auctionOpened: true },
    );

  it("records a bid that exceeds the current high", () => {
    const state = submitBid(base(), 1, 5);
    expect(state.positiveSetup?.bids).toEqual([{ player: 1, tricks: 5 }]);
    const raised = submitBid(state, 2, 8);
    expect(raised.positiveSetup?.bids).toEqual([
      { player: 1, tricks: 5 },
      { player: 2, tricks: 8 },
    ]);
  });

  it("rejects a bid that doesn't exceed the current high", () => {
    const state = submitBid(base(), 1, 5);
    expect(() => submitBid(state, 2, 5)).toThrow();
    expect(() => submitBid(state, 2, 3)).toThrow();
  });

  it("rejects a bid from the dealer", () => {
    expect(() => submitBid(base(), 0, 5)).toThrow();
  });
});

describe("resolveDealerDecision", () => {
  const withBids = () =>
    withPositiveHand(
      { ...createGame(DEFAULT_GAME_RULES, 0), phase: "auction-bidding" },
      { auctionOpened: true, bids: [{ player: 1, tricks: 5 }] },
    );

  it("dealer declines: no transfer, dealer keeps trump-naming rights", () => {
    const state = resolveDealerDecision(withBids(), 0, false);
    expect(state.phase).toBe("trump-selection");
    expect(state.positiveSetup?.auction).toBeNull();
    expect(state.positiveSetup?.trumpNamer).toBe(0);
  });

  it("dealer accepts: auction winner becomes trump-namer", () => {
    const state = resolveDealerDecision(withBids(), 0, true);
    expect(state.positiveSetup?.auction).toEqual({ dealer: 0, winner: 1, bid: 5 });
    expect(state.positiveSetup?.trumpNamer).toBe(1);
  });

  it("auctionMustSell forces acceptance even if the dealer declines", () => {
    const state = { ...withBids(), ruleSet: rulesWith({ auctionMustSell: true }) };
    const resolved = resolveDealerDecision(state, 0, false);
    expect(resolved.positiveSetup?.trumpNamer).toBe(1);
  });

  it("throws if not decided by the dealer", () => {
    expect(() => resolveDealerDecision(withBids(), 1, true)).toThrow();
  });
});

describe("playCard", () => {
  function trickInProgressState(): GameState {
    return {
      ...createGame(DEFAULT_GAME_RULES, 0),
      phase: "playing",
      handType: "noTricks",
      hands: {
        0: [{ suit: "S", rank: 2 }],
        1: [{ suit: "S", rank: 5 }],
        2: [{ suit: "H", rank: 9 }],
        3: [{ suit: "D", rank: 3 }],
      },
      currentTrick: [],
      currentTurn: 0,
    };
  }

  it("throws if it isn't the player's turn", () => {
    expect(() => playCard(trickInProgressState(), 1, { suit: "S", rank: 5 })).toThrow();
  });

  it("throws on an illegal card", () => {
    const led: GameState = {
      ...trickInProgressState(),
      hands: { 0: [], 1: [{ suit: "H", rank: 5 }, { suit: "S", rank: 9 }], 2: [], 3: [] },
      currentTrick: [{ player: 0, card: { suit: "S", rank: 2 } }],
      currentTurn: 1,
    };
    // Player 1 holds a spade (S9) and must follow suit — the heart is illegal.
    expect(() => playCard(led, 1, { suit: "H", rank: 5 })).toThrow();
  });

  it("resolves the trick once all 4 have played, and the winner leads next", () => {
    let state = trickInProgressState();
    state = playCard(state, 0, { suit: "S", rank: 2 });
    state = playCard(state, 1, { suit: "S", rank: 5 });
    state = playCard(state, 2, { suit: "H", rank: 9 });
    state = playCard(state, 3, { suit: "D", rank: 3 });

    expect(state.phase).toBe("playing"); // only 1 of 13 tricks done
    expect(state.completedTricks).toHaveLength(1);
    expect(state.completedTricks[0].winner).toBe(1); // S5 beats S2, the only spades in the trick
    expect(state.currentTurn).toBe(1);
    expect(state.currentTrick).toEqual([]);
  });

  it("completing the 13th trick scores the hand and moves to 'hand-complete'", () => {
    const twelveTricks: Trick[] = Array.from({ length: 12 }, (_, i) => dummyTrick((i % 4) as PlayerIndex));
    let state: GameState = {
      ...trickInProgressState(),
      completedTricks: twelveTricks,
    };
    state = playCard(state, 0, { suit: "S", rank: 2 });
    state = playCard(state, 1, { suit: "S", rank: 5 });
    state = playCard(state, 2, { suit: "H", rank: 9 });
    state = playCard(state, 3, { suit: "D", rank: 3 });

    expect(state.phase).toBe("hand-complete");
    expect(state.completedTricks).toHaveLength(13);
    // 3 of the 12 dummy tricks each, at -20/trick, plus the 13th trick's winner (player 1, S5 > S2) gets one more.
    expect(state.cumulativeScores).toEqual({ 0: -60, 1: -80, 2: -60, 3: -60 });
    expect(state.handHistory).toHaveLength(1);
    expect(state.handHistory[0].handType).toBe("noTricks");
  });

  it("mandatoryKilling in ruleSet does not leak into a negative hand's legality", () => {
    const state: GameState = {
      ...createGame(rulesWith({ mandatoryKilling: true }), 0),
      phase: "playing",
      handType: "noTricks",
      hands: {
        0: [],
        1: [
          { suit: "S", rank: 3 },
          { suit: "S", rank: 9 },
        ],
        2: [],
        3: [],
      },
      currentTrick: [{ player: 0, card: { suit: "S", rank: 7 } }],
      currentTurn: 1,
    };
    // Under mandatory killing S9 would be forced (it beats S7); a negative hand must ignore that.
    expect(() => playCard(state, 1, { suit: "S", rank: 3 })).not.toThrow();
  });

  it("mandatoryKilling does apply on a positive hand when enabled", () => {
    const state: GameState = withPositiveHand(
      {
        ...createGame(rulesWith({ mandatoryKilling: true }), 0),
        phase: "playing",
        hands: {
          0: [],
          1: [
            { suit: "S", rank: 3 },
            { suit: "S", rank: 9 },
          ],
          2: [],
          3: [],
        },
        currentTrick: [{ player: 0, card: { suit: "S", rank: 7 } }],
        currentTurn: 1,
      },
      { trump: null },
    );
    expect(() => playCard(state, 1, { suit: "S", rank: 3 })).toThrow();
    expect(() => playCard(state, 1, { suit: "S", rank: 9 })).not.toThrow();
  });

  it("cannot lead a heart in No Hearts / No King of Hearts while holding another suit", () => {
    for (const handType of ["noHearts", "noKingOfHearts"] as const) {
      const state: GameState = {
        ...createGame(DEFAULT_GAME_RULES, 0),
        phase: "playing",
        handType,
        hands: {
          0: [
            { suit: "H", rank: 8 },
            { suit: "S", rank: 4 },
          ],
          1: [],
          2: [],
          3: [],
        },
        currentTrick: [],
        currentTurn: 0,
      };
      expect(legalCardsFor(state, 0)).toEqual([{ suit: "S", rank: 4 }]);
      expect(() => playCard(state, 0, { suit: "H", rank: 8 })).toThrow();
      expect(() => playCard(state, 0, { suit: "S", rank: 4 })).not.toThrow();
    }
  });

  it("may lead a heart in No Hearts / No King of Hearts once hearts is all that's left", () => {
    const state: GameState = {
      ...createGame(DEFAULT_GAME_RULES, 0),
      phase: "playing",
      handType: "noHearts",
      hands: {
        0: [
          { suit: "H", rank: 8 },
          { suit: "H", rank: 2 },
        ],
        1: [],
        2: [],
        3: [],
      },
      currentTrick: [],
      currentTurn: 0,
    };
    expect(() => playCard(state, 0, { suit: "H", rank: 8 })).not.toThrow();
  });

  it("the heart-leading restriction only applies when leading, not when following suit", () => {
    // Hearts was already led by someone else; player 1 must still follow suit with a heart even
    // though this is the No Hearts hand and they hold a non-heart card too.
    const state: GameState = {
      ...createGame(DEFAULT_GAME_RULES, 0),
      phase: "playing",
      handType: "noHearts",
      hands: {
        0: [],
        1: [
          { suit: "H", rank: 5 },
          { suit: "S", rank: 9 },
        ],
        2: [],
        3: [],
      },
      currentTrick: [{ player: 0, card: { suit: "H", rank: 3 } }],
      currentTurn: 1,
    };
    expect(legalCardsFor(state, 1)).toEqual([{ suit: "H", rank: 5 }]);
  });
});

describe("advanceHand", () => {
  it("moves to the next hand: handIndex+1, HAND_SEQUENCE-matched handType, rotated dealer, awaiting-deal", () => {
    const state: GameState = { ...createGame(DEFAULT_GAME_RULES, 1), phase: "hand-complete" };
    const next = advanceHand(state);
    expect(next.handIndex).toBe(1);
    expect(next.handType).toBe("noHearts");
    expect(next.dealer).toBe(2); // rotateLeftEachHand(1, firstDealer=1) = 2
    expect(next.phase).toBe("awaiting-deal");
  });

  it("moves to 'game-complete' after the 10th hand", () => {
    const state: GameState = { ...createGame(DEFAULT_GAME_RULES, 0), handIndex: 9, phase: "hand-complete" };
    const next = advanceHand(state);
    expect(next.phase).toBe("game-complete");
  });

  it("throws if not hand-complete", () => {
    expect(() => advanceHand({ ...createGame(DEFAULT_GAME_RULES, 0), phase: "playing" })).toThrow();
  });
});
