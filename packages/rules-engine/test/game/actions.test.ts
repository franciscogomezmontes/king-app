import { describe, expect, it } from "vitest";
import { createDeck } from "../../src/deck";
import {
  advanceHand,
  declareTrump,
  dealHand,
  illegalPlayReason,
  legalCardsFor,
  openAuction,
  playCard,
  requestRedeal,
  resolveDealerDecision,
  submitBid,
} from "../../src/game/actions";
import { createGame, DEFAULT_GAME_RULES, GameRules, GameState, PositiveHandSetup } from "../../src/game/state";
import { Card, PlayerIndex, Trick } from "../../src/types";

const rulesWith = (overrides: Partial<GameRules>): GameRules => ({ ...DEFAULT_GAME_RULES, ...overrides });

/** Builds a full, valid 52-card deck (as `deal()`'s round-robin expects) with `hand` (exactly 13
 * cards) guaranteed to land on `forPlayer`, so a redeal test can set up "this player's hand has
 * zero face cards" deterministically instead of relying on a lucky shuffle. */
function buildDeckWithHand(hand: Card[], forPlayer: PlayerIndex): Card[] {
  const remaining = createDeck().filter((c) => !hand.some((h) => h.suit === c.suit && h.rank === c.rank));
  const deck: Card[] = [];
  let handIndex = 0;
  let restIndex = 0;
  for (let i = 0; i < 52; i++) {
    if (i % 4 === forPlayer) deck.push(hand[handIndex++]);
    else deck.push(remaining[restIndex++]);
  }
  return deck;
}

const NON_FACE_CARDS = createDeck().filter((c) => c.rank < 11); // ranks 2-10, 36 cards total

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

describe("requestRedeal", () => {
  const noFaceHand = NON_FACE_CARDS.slice(0, 13);
  const oneFaceHand = [...NON_FACE_CARDS.slice(0, 12), { suit: "S", rank: 11 } as Card];

  function dealtPositiveHand(player: PlayerIndex, hand: Card[], dealer: PlayerIndex = 0): GameState {
    let state = createGame(DEFAULT_GAME_RULES, dealer);
    state = { ...state, handIndex: 6, handType: "positive" };
    return dealHand(state, buildDeckWithHand(hand, player));
  }

  it("redeals: fresh hands, back to trump-selection, same dealer, positiveSetup reset", () => {
    const state = dealtPositiveHand(0, noFaceHand, /* dealer */ 2);
    const redealt = requestRedeal(state, 0, buildDeckWithHand(noFaceHand, 0));
    expect(redealt.phase).toBe("trump-selection");
    expect(redealt.dealer).toBe(2); // unchanged — same hand, same dealer, just redealt
    expect(redealt.handIndex).toBe(6); // still the same hand, not advanced
    expect(redealt.positiveSetup).toEqual({
      trumpNamer: 2,
      trump: null,
      direction: "up",
      backwards: false,
      auctionOpened: false,
      bids: [],
      auction: null,
    });
    for (const player of [0, 1, 2, 3] as PlayerIndex[]) expect(redealt.hands[player]).toHaveLength(13);
  });

  it("also clears the empty completedTricks/currentTrick (both already empty right after a deal, but stays correct if requested again after a partial trick elsewhere)", () => {
    const state = dealtPositiveHand(0, noFaceHand);
    const redealt = requestRedeal(state, 0, buildDeckWithHand(noFaceHand, 0));
    expect(redealt.completedTricks).toEqual([]);
    expect(redealt.currentTrick).toEqual([]);
  });

  it("throws when the rule is disabled", () => {
    let state = dealtPositiveHand(0, noFaceHand);
    state = { ...state, ruleSet: rulesWith({ noFaceCardsRedealEnabled: false }) };
    expect(() => requestRedeal(state, 0, buildDeckWithHand(noFaceHand, 0))).toThrow();
  });

  it("throws for a negative hand", () => {
    let state = createGame(DEFAULT_GAME_RULES, 0);
    state = dealHand(state, buildDeckWithHand(noFaceHand, 0));
    expect(state.handType).not.toBe("positive");
    expect(() => requestRedeal(state, 0, createDeck())).toThrow();
  });

  it("throws when the player's hand has a face card", () => {
    const state = dealtPositiveHand(0, oneFaceHand);
    expect(() => requestRedeal(state, 0, buildDeckWithHand(noFaceHand, 0))).toThrow();
  });

  it("throws once the requesting player has played a card this hand, even mid-auction after another player already went", () => {
    let state = dealtPositiveHand(0, noFaceHand);
    state = declareTrump(state, state.dealer, "S", "up", false); // dealer names trump directly
    // Keep feeding legal plays (mandatoryKilling defaults on, so an arbitrary card can be illegal)
    // until player 0 has played once, matching real turn order.
    while (!state.currentTrick.some((p) => p.player === 0) && state.phase === "playing") {
      const turn = state.currentTurn;
      state = playCard(state, turn, legalCardsFor(state, turn)[0]);
    }
    expect(() => requestRedeal(state, 0, buildDeckWithHand(noFaceHand, 0))).toThrow();
  });

  it("does NOT close another player's window just because someone else already played", () => {
    let state = dealtPositiveHand(0, noFaceHand);
    state = declareTrump(state, state.dealer, "S", "up", false);
    // Whoever leads first plays a card — this should not affect player 0's own eligibility unless
    // player 0 was the one who played.
    const leader = state.currentTurn;
    if (leader !== 0) {
      state = playCard(state, leader, legalCardsFor(state, leader)[0]);
      expect(() => requestRedeal(state, 0, buildDeckWithHand(noFaceHand, 0))).not.toThrow();
    }
  });

  it("a full game can still reach game-complete zero-sum after a mid-game redeal", () => {
    let state = createGame(DEFAULT_GAME_RULES, 0);
    // Play through the 6 negative hands untouched.
    for (let i = 0; i < 6; i++) {
      state = dealHand(state, createDeck());
      while (state.phase === "playing") {
        const turn = state.currentTurn;
        const legal = legalCardsFor(state, turn);
        state = playCard(state, turn, legal[0]);
      }
      state = advanceHand(state);
    }
    // Hand 7 (first positive hand): redeal once, then play it out normally.
    state = dealHand(state, buildDeckWithHand(noFaceHand, state.dealer));
    state = requestRedeal(state, state.dealer, createDeck());
    state = declareTrump(state, state.dealer, "S", "up", false);
    while (state.phase === "playing") {
      const turn = state.currentTurn;
      const legal = legalCardsFor(state, turn);
      state = playCard(state, turn, legal[0]);
    }
    state = advanceHand(state);
    // Remaining 3 positive hands, untouched.
    for (let i = 0; i < 3; i++) {
      state = dealHand(state, createDeck());
      state = declareTrump(state, state.dealer, "S", "up", false);
      while (state.phase === "playing") {
        const turn = state.currentTurn;
        const legal = legalCardsFor(state, turn);
        state = playCard(state, turn, legal[0]);
      }
      state = advanceHand(state);
    }
    expect(state.phase).toBe("game-complete");
    const total = state.cumulativeScores[0] + state.cumulativeScores[1] + state.cumulativeScores[2] + state.cumulativeScores[3];
    expect(total).toBe(0);
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

describe("illegalPlayReason", () => {
  it("must-follow-suit: holding a led-suit card but attempting to play a different suit", () => {
    const state: GameState = {
      ...createGame(DEFAULT_GAME_RULES, 0),
      phase: "playing",
      handType: "noTricks",
      hands: { 0: [], 1: [{ suit: "H", rank: 5 }, { suit: "S", rank: 9 }], 2: [], 3: [] },
      currentTrick: [{ player: 0, card: { suit: "S", rank: 2 } }],
    };
    expect(illegalPlayReason(state, 1, { suit: "H", rank: 5 })).toBe("must-follow-suit");
    expect(illegalPlayReason(state, 1, { suit: "S", rank: 9 })).toBeNull(); // the follower itself is legal
  });

  it("must-beat: Mandatory Killing on, holds a led-suit card that beats and one that doesn't", () => {
    const state: GameState = withPositiveHand(
      {
        ...createGame(rulesWith({ mandatoryKilling: true }), 0),
        phase: "playing",
        handType: "positive",
        hands: { 0: [], 1: [{ suit: "S", rank: 3 }, { suit: "S", rank: 9 }], 2: [], 3: [] },
        currentTrick: [{ player: 0, card: { suit: "S", rank: 7 } }],
      },
      { trump: null },
    );
    expect(illegalPlayReason(state, 1, { suit: "S", rank: 3 })).toBe("must-beat"); // doesn't beat S7
    expect(illegalPlayReason(state, 1, { suit: "S", rank: 9 })).toBeNull(); // beats S7
  });

  it("must-trump: Mandatory Killing on, void in the led suit, holds a trump that beats and one that doesn't (a trump was already thrown)", () => {
    const state: GameState = withPositiveHand(
      {
        ...createGame(rulesWith({ mandatoryKilling: true }), 0),
        phase: "playing",
        handType: "positive",
        hands: {
          0: [],
          2: [{ suit: "H", rank: 2 }, { suit: "H", rank: 9 }, { suit: "C", rank: 5 }],
          1: [],
          3: [],
        },
        currentTrick: [
          { player: 0, card: { suit: "S", rank: 7 } },
          { player: 3, card: { suit: "H", rank: 4 } }, // already trumped
        ],
      },
      { trump: "H" },
    );
    expect(illegalPlayReason(state, 2, { suit: "H", rank: 2 })).toBe("must-trump"); // H4 already beats H2
    expect(illegalPlayReason(state, 2, { suit: "C", rank: 5 })).toBe("must-trump"); // a real beater (H9) exists
    expect(illegalPlayReason(state, 2, { suit: "H", rank: 9 })).toBeNull(); // beats H4
  });

  it("hearts-locked: leading a hand where hearts may only be led once they're all that's left", () => {
    const state: GameState = {
      ...createGame(DEFAULT_GAME_RULES, 0),
      phase: "playing",
      handType: "noHearts",
      hands: { 0: [], 1: [{ suit: "H", rank: 5 }, { suit: "S", rank: 9 }], 2: [], 3: [] },
      currentTrick: [],
    };
    expect(illegalPlayReason(state, 1, { suit: "H", rank: 5 })).toBe("hearts-locked");
    expect(illegalPlayReason(state, 1, { suit: "S", rank: 9 })).toBeNull();
  });

  it("returns null for a card that's actually legal under a plain follow-suit-only hand", () => {
    const state: GameState = {
      ...createGame(DEFAULT_GAME_RULES, 0),
      phase: "playing",
      handType: "noTricks",
      hands: { 0: [], 1: [{ suit: "H", rank: 5 }], 2: [], 3: [] },
      currentTrick: [{ player: 0, card: { suit: "S", rank: 2 } }],
    };
    // Void in the led suit, Mandatory Killing off — free play.
    expect(illegalPlayReason(state, 1, { suit: "H", rank: 5 })).toBeNull();
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

describe("playCard — early hand-completion once a negative hand's outcome is decided", () => {
  function trickWith(cards: [Card, Card, Card, Card], winner: PlayerIndex): Trick {
    return {
      plays: [
        { player: 0, card: cards[0] },
        { player: 1, card: cards[1] },
        { player: 2, card: cards[2] },
        { player: 3, card: cards[3] },
      ],
      winner,
    };
  }

  it("noKingOfHearts: ends the instant K♥ is captured, without waiting for 13 tricks", () => {
    const state: GameState = {
      ...createGame(DEFAULT_GAME_RULES, 0),
      phase: "playing",
      handType: "noKingOfHearts",
      hands: {
        0: [{ suit: "H", rank: 13 }],
        1: [{ suit: "H", rank: 2 }],
        2: [{ suit: "H", rank: 3 }],
        3: [{ suit: "H", rank: 4 }],
      },
      currentTrick: [],
      currentTurn: 0,
    };
    let s = state;
    s = playCard(s, 0, { suit: "H", rank: 13 });
    s = playCard(s, 1, { suit: "H", rank: 2 });
    s = playCard(s, 2, { suit: "H", rank: 3 });
    s = playCard(s, 3, { suit: "H", rank: 4 });

    expect(s.phase).toBe("hand-complete");
    expect(s.completedTricks).toHaveLength(1);
    // Player 0 captured K♥ (highest heart in an all-hearts trick, so they win it): -160.
    expect(s.cumulativeScores).toEqual({ 0: -160, 1: 0, 2: 0, 3: 0 });
  });

  it("noGentlemen: ends the instant the 8th king-or-jack is captured, part-way through a hand", () => {
    // 7 gentlemen captured across 2 already-completed tricks (player 0 gets 4, player 1 gets 3).
    const priorTricks: Trick[] = [
      trickWith(
        [
          { suit: "S", rank: 13 }, // K♠
          { suit: "H", rank: 13 }, // K♥
          { suit: "D", rank: 11 }, // J♦
          { suit: "C", rank: 11 }, // J♣
        ],
        0,
      ),
      trickWith(
        [
          { suit: "D", rank: 13 }, // K♦
          { suit: "H", rank: 11 }, // J♥
          { suit: "C", rank: 13 }, // K♣
          { suit: "C", rank: 2 }, // filler, not a gentleman
        ],
        1,
      ),
    ];
    const state: GameState = {
      ...createGame(DEFAULT_GAME_RULES, 0),
      phase: "playing",
      handType: "noGentlemen",
      hands: {
        0: [{ suit: "S", rank: 11 }], // J♠ — the 8th gentleman
        1: [{ suit: "D", rank: 2 }],
        2: [{ suit: "D", rank: 3 }],
        3: [{ suit: "D", rank: 4 }],
      },
      completedTricks: priorTricks,
      currentTrick: [],
      currentTurn: 0,
    };
    let s = state;
    s = playCard(s, 0, { suit: "S", rank: 11 }); // leads J♠
    s = playCard(s, 1, { suit: "D", rank: 2 }); // void in spades, free discard
    s = playCard(s, 2, { suit: "D", rank: 3 });
    s = playCard(s, 3, { suit: "D", rank: 4 });

    expect(s.phase).toBe("hand-complete");
    expect(s.completedTricks).toHaveLength(3); // not all 13
    // Player 0: 4 (trick 1) + 1 (J♠ just now) = 5 gentlemen -> -150. Player 1: 3 -> -90.
    expect(s.cumulativeScores).toEqual({ 0: -150, 1: -90, 2: 0, 3: 0 });
  });

  it("noLady: ends the instant the 4th queen is captured", () => {
    const priorTricks: Trick[] = [
      trickWith(
        [
          { suit: "S", rank: 12 }, // Q♠
          { suit: "H", rank: 12 }, // Q♥
          { suit: "D", rank: 12 }, // Q♦
          { suit: "C", rank: 2 }, // filler
        ],
        2,
      ),
    ];
    const state: GameState = {
      ...createGame(DEFAULT_GAME_RULES, 0),
      phase: "playing",
      handType: "noLady",
      hands: {
        0: [{ suit: "C", rank: 12 }], // Q♣ — the 4th queen
        1: [{ suit: "C", rank: 3 }],
        2: [{ suit: "C", rank: 4 }],
        3: [{ suit: "C", rank: 5 }],
      },
      completedTricks: priorTricks,
      currentTrick: [],
      currentTurn: 0,
    };
    let s = state;
    s = playCard(s, 0, { suit: "C", rank: 12 });
    s = playCard(s, 1, { suit: "C", rank: 3 });
    s = playCard(s, 2, { suit: "C", rank: 4 });
    s = playCard(s, 3, { suit: "C", rank: 5 });

    expect(s.phase).toBe("hand-complete");
    expect(s.completedTricks).toHaveLength(2);
    // Player 2 already had 3 queens (-150); player 0's club trick (highest club C12) adds Q♣ (-50).
    expect(s.cumulativeScores).toEqual({ 0: -50, 1: 0, 2: -150, 3: 0 });
  });

  it("noHearts: ends the instant the 13th (final) heart is captured", () => {
    const priorTricks: Trick[] = [
      trickWith(
        [{ suit: "H", rank: 2 }, { suit: "H", rank: 3 }, { suit: "H", rank: 4 }, { suit: "H", rank: 5 }],
        0,
      ),
      trickWith(
        [{ suit: "H", rank: 6 }, { suit: "H", rank: 7 }, { suit: "H", rank: 8 }, { suit: "H", rank: 9 }],
        1,
      ),
      trickWith(
        [{ suit: "H", rank: 10 }, { suit: "H", rank: 11 }, { suit: "H", rank: 12 }, { suit: "H", rank: 13 }],
        2,
      ),
    ];
    const state: GameState = {
      ...createGame(DEFAULT_GAME_RULES, 0),
      phase: "playing",
      handType: "noHearts",
      hands: {
        0: [{ suit: "C", rank: 2 }],
        1: [{ suit: "C", rank: 3 }],
        2: [{ suit: "C", rank: 4 }],
        3: [{ suit: "H", rank: 14 }], // the 13th and final heart — all they have left, so legal to lead
      },
      completedTricks: priorTricks,
      currentTrick: [],
      currentTurn: 3,
    };
    let s = state;
    s = playCard(s, 3, { suit: "H", rank: 14 });
    s = playCard(s, 0, { suit: "C", rank: 2 });
    s = playCard(s, 1, { suit: "C", rank: 3 });
    s = playCard(s, 2, { suit: "C", rank: 4 });

    expect(s.phase).toBe("hand-complete");
    expect(s.completedTricks).toHaveLength(4); // not all 13
    expect(s.cumulativeScores).toEqual({ 0: -80, 1: -80, 2: -80, 3: -20 });
  });

  it("does NOT end early while the triggering condition isn't met yet (boundary check)", () => {
    // Only 6 of the 8 gentlemen captured so far — hand must continue.
    const priorTricks: Trick[] = [
      trickWith(
        [
          { suit: "S", rank: 13 },
          { suit: "H", rank: 13 },
          { suit: "D", rank: 11 },
          { suit: "C", rank: 11 },
        ],
        0,
      ),
      trickWith(
        [
          { suit: "D", rank: 13 },
          { suit: "H", rank: 11 },
          { suit: "C", rank: 2 }, // filler, not a gentleman (only 2 gentlemen in this trick)
          { suit: "S", rank: 3 }, // filler
        ],
        1,
      ),
    ];
    const state: GameState = {
      ...createGame(DEFAULT_GAME_RULES, 0),
      phase: "playing",
      handType: "noGentlemen",
      hands: {
        0: [{ suit: "S", rank: 2 }], // no gentlemen involved this trick
        1: [{ suit: "S", rank: 4 }],
        2: [{ suit: "S", rank: 5 }],
        3: [{ suit: "S", rank: 6 }],
      },
      completedTricks: priorTricks,
      currentTrick: [],
      currentTurn: 0,
    };
    let s = state;
    s = playCard(s, 0, { suit: "S", rank: 2 });
    s = playCard(s, 1, { suit: "S", rank: 4 });
    s = playCard(s, 2, { suit: "S", rank: 5 });
    s = playCard(s, 3, { suit: "S", rank: 6 });

    expect(s.phase).toBe("playing"); // still going — only 6 gentlemen captured, not 8
    expect(s.completedTricks).toHaveLength(3);
  });

  it("does not apply to No Tricks or No Last Two Tricks — every trick can still matter right to the end", () => {
    // 13 tricks' worth of "danger" happening early doesn't exist for these two hand types, so a
    // hand-history entry should never appear before the real 13th trick. Spot-check via a
    // negative-hand-agnostic trick sequence that would trip every other early-stop condition at
    // once (all gentlemen, all queens, K♥, and 13 hearts already gone) and confirm noTricks still
    // requires the full 13.
    const heavyTrick: Trick = trickWith(
      [
        { suit: "H", rank: 13 }, // K♥
        { suit: "H", rank: 12 }, // Q♥
        { suit: "H", rank: 11 }, // J♥
        { suit: "H", rank: 10 },
      ],
      0,
    );
    const state: GameState = {
      ...createGame(DEFAULT_GAME_RULES, 0),
      phase: "playing",
      handType: "noTricks",
      completedTricks: [heavyTrick],
      hands: { 0: [{ suit: "C", rank: 2 }], 1: [{ suit: "C", rank: 3 }], 2: [{ suit: "C", rank: 4 }], 3: [{ suit: "C", rank: 5 }] },
      currentTrick: [],
      currentTurn: 0,
    };
    let s = state;
    s = playCard(s, 0, { suit: "C", rank: 2 });
    s = playCard(s, 1, { suit: "C", rank: 3 });
    s = playCard(s, 2, { suit: "C", rank: 4 });
    s = playCard(s, 3, { suit: "C", rank: 5 });

    expect(s.phase).toBe("playing");
    expect(s.completedTricks).toHaveLength(2);
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
