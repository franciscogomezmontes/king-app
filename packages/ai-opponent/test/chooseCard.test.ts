import { describe, expect, it } from "vitest";
import {
  Card,
  createGame,
  DEFAULT_GAME_RULES,
  GameState,
  NEGATIVE_HAND_ORDER,
  NegativeHandType,
  PlayerIndex,
  Trick,
} from "rules-engine";
import { chooseCard } from "../src/chooseCard";
import { ismctsChooseCard } from "../src/ismcts";

function card(suit: Card["suit"], rank: Card["rank"]): Card {
  return { suit, rank };
}

// Same small deterministic PRNG used throughout this package's other ISMCTS tests.
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

function dummyTrick(winner: PlayerIndex): Trick {
  return {
    plays: [
      { player: 0, card: card("C", 2) },
      { player: 1, card: card("C", 3) },
      { player: 2, card: card("C", 4) },
      { player: 3, card: card("C", 5) },
    ],
    winner,
  };
}

/** A completed trick with caller-specified plays — for tests that need specific cards to have
 * already fallen (e.g. to make a card a "master"). The winner is arbitrary; nothing under test
 * reads it. */
function dummyTrickOf(plays: { player: PlayerIndex; card: Card }[]): Trick {
  return { plays, winner: plays[0].player };
}

function withPositiveSetup(state: GameState, trump: Card["suit"] | null = null): GameState {
  return {
    ...state,
    handType: "positive",
    positiveSetup: {
      trumpNamer: state.dealer,
      trump,
      direction: "up",
      backwards: false,
      auctionOpened: false,
      bids: [],
      auction: null,
    },
  };
}

describe("chooseCard — leading", () => {
  it("negative hand: leads the lowest card", () => {
    const state: GameState = {
      ...createGame(DEFAULT_GAME_RULES, 0),
      phase: "playing",
      handType: "noTricks",
      hands: { 0: [card("S", 9), card("H", 2), card("D", 13)], 1: [], 2: [], 3: [] },
      currentTrick: [],
      currentTurn: 0,
    };
    expect(chooseCard(state, 0)).toEqual(card("H", 2));
  });

  it("positive hand: leads the highest card", () => {
    const state: GameState = withPositiveSetup({
      ...createGame(DEFAULT_GAME_RULES, 0),
      phase: "playing",
      hands: { 0: [card("S", 9), card("H", 2), card("D", 13)], 1: [], 2: [], 3: [] },
      currentTrick: [],
      currentTurn: 0,
    });
    expect(chooseCard(state, 0)).toEqual(card("D", 13));
  });
});

describe("chooseCard — negative-hand leading avoids self-evidently dominated master leads", () => {
  // Francisco's exact scenario: No Queens (negative, no trump), no clubs played by anyone yet, the
  // bot holds the entire top of the club suit itself (Ace, King, Queen) — so leading any of them
  // is a proven master with zero chance of losing its own trick, exactly backwards for a hand
  // whose entire goal is to avoid winning. A safe, non-dominated alternative (a low diamond) is
  // available instead.
  function stateWithMasterClubsAndASafeAlternative(): GameState {
    return {
      ...createGame(DEFAULT_GAME_RULES, 0),
      phase: "playing",
      handType: "noLady",
      hands: { 0: [card("C", 14), card("C", 13), card("C", 12), card("D", 2)], 1: [], 2: [], 3: [] },
      currentTrick: [],
      currentTurn: 0,
    };
  }

  it("chooseCardHeuristic (Normal): leads the safe diamond, not a proven-master club", () => {
    const led = chooseCard(stateWithMasterClubsAndASafeAlternative(), 0, "normal");
    expect(led.suit).not.toBe("C");
    expect(led).toEqual(card("D", 2));
  });

  it("ismctsChooseCard (Difícil/Experto-scale budgets): never leads a proven-master club when a safe alternative exists", () => {
    // Test-scoped small budgets, same pattern as hardVsNormal.test.ts's TEST_SEARCH_BUDGET_MS —
    // proves the root-filter mechanism itself, not a specific production budget.
    for (const budgetMs of [15, 50]) {
      const led = ismctsChooseCard(stateWithMasterClubsAndASafeAlternative(), 0, budgetMs, mulberry32(7));
      expect(led.suit).not.toBe("C");
      expect(led).toEqual(card("D", 2));
    }
  });
});

describe("chooseCard — negative-hand leading avoids this hand type's own danger category", () => {
  // Francisco's exact bug report: at Expert difficulty, in "No J's ni K's" (noGentlemen), a bot
  // led the very first trick of the hand with a King or Jack. The lowest-ranked card *available*
  // happens to be a Jack here — plain "lead lowest" would pick it, exactly backwards for a hand
  // whose entire goal is to avoid capturing a Jack or King. A safe non-J/K alternative (a Queen)
  // exists instead and should be preferred, even though it outranks the Jack.
  function stateWithLowestCardDangerousForNoGentlemen(): GameState {
    return {
      ...createGame(DEFAULT_GAME_RULES, 0),
      phase: "playing",
      handType: "noGentlemen",
      hands: { 0: [card("D", 13), card("S", 11), card("H", 12), card("C", 14)], 1: [], 2: [], 3: [] },
      currentTrick: [],
      currentTurn: 0,
    };
  }

  it("chooseCardHeuristic (Normal): leads the safe Queen, not the lower-ranked but dangerous Jack", () => {
    const led = chooseCard(stateWithLowestCardDangerousForNoGentlemen(), 0, "normal");
    expect(led).toEqual(card("H", 12));
  });

  it("ismctsChooseCard (Difícil/Experto-scale budgets): never leads a Jack or King when a safe alternative exists", () => {
    for (const budgetMs of [15, 50]) {
      const led = ismctsChooseCard(stateWithLowestCardDangerousForNoGentlemen(), 0, budgetMs, mulberry32(7));
      expect(led.rank).not.toBe(11);
      expect(led.rank).not.toBe(13);
    }
  });

  it("forced position: every legal lead is dangerous (only Jacks/Kings left) — falls back to the lowest of them", () => {
    const state: GameState = {
      ...createGame(DEFAULT_GAME_RULES, 0),
      phase: "playing",
      handType: "noGentlemen",
      hands: { 0: [card("D", 13), card("S", 11)], 1: [], 2: [], 3: [] },
      currentTrick: [],
      currentTurn: 0,
    };
    expect(chooseCard(state, 0)).toEqual(card("S", 11));
  });
});

describe("chooseCard — negative hands, following suit", () => {
  it("plays the most dangerous card that still avoids winning, when a safe option exists", () => {
    // A nonWinner is a permanently safe fact — already beaten by S7, that can't change no matter
    // what else is played — so this is a zero-cost moment to shed the more dangerous of the two
    // safe options (S6, ranked higher = more dangerous for noTricks) rather than hoarding it.
    const state: GameState = {
      ...createGame(DEFAULT_GAME_RULES, 0),
      phase: "playing",
      handType: "noTricks",
      hands: { 0: [], 1: [card("S", 3), card("S", 6), card("S", 10)], 2: [], 3: [] },
      currentTrick: [{ player: 0, card: card("S", 7) }],
      currentTurn: 1,
    };
    // S3 and S6 are both safe (under S7); S10 would win. Most dangerous of the safe two is S6.
    expect(chooseCard(state, 1)).toEqual(card("S", 6));
  });

  it("when forced to win (every follower beats the current best), plays the lowest of them", () => {
    const state: GameState = {
      ...createGame(DEFAULT_GAME_RULES, 0),
      phase: "playing",
      handType: "noTricks",
      hands: { 0: [], 1: [card("S", 9), card("S", 12)], 2: [], 3: [] },
      currentTrick: [{ player: 0, card: card("S", 7) }],
      currentTurn: 1,
    };
    expect(chooseCard(state, 1)).toEqual(card("S", 9));
  });

  it("No Queens: sheds the Queen under a safe non-winning follow rather than hoarding it", () => {
    // Francisco's exact scenario: the leader plays an Ace, the bot holds the Queen of that suit
    // plus other, genuinely safer low cards it could legally follow with instead. The Queen is a
    // permanently safe discard here (it can never beat an already-played Ace), so the bot should
    // take the zero-cost opportunity to get rid of it now rather than keep holding the danger card
    // and hope for another safe window later.
    const state: GameState = {
      ...createGame(DEFAULT_GAME_RULES, 0),
      phase: "playing",
      handType: "noLady",
      hands: { 0: [], 1: [card("S", 12), card("S", 4), card("S", 6)], 2: [], 3: [] },
      currentTrick: [{ player: 0, card: card("S", 14) }],
      currentTurn: 1,
    };
    expect(chooseCard(state, 1)).toEqual(card("S", 12));
  });
});

describe("chooseCard — negative hands, void discards", () => {
  const dangerousCardByHandType: Record<NegativeHandType, Card> = {
    noTricks: card("D", 12), // no specific category — just the highest card
    noHearts: card("H", 5),
    noGentlemen: card("D", 13), // king
    noLady: card("C", 12), // queen
    noKingOfHearts: card("H", 13), // king of hearts specifically
    noLastTwo: card("D", 11),
  };

  for (const handType of NEGATIVE_HAND_ORDER) {
    it(`${handType}: discards the most dangerous card when void and free to choose`, () => {
      const dangerous = dangerousCardByHandType[handType];
      const safe = card("C", 2); // a plain low club, never the dangerous category here
      const state: GameState = {
        ...createGame(DEFAULT_GAME_RULES, 0),
        phase: "playing",
        handType,
        hands: { 0: [], 1: [dangerous, safe], 2: [], 3: [] },
        // Led suit is spades; player 1 holds no spades, so both options are free void discards.
        currentTrick: [{ player: 0, card: card("S", 4) }],
        currentTurn: 1,
      };
      expect(chooseCard(state, 1)).toEqual(dangerous);
    });
  }
});

describe("chooseCard — No Last Two Tricks: dumps high cards early, avoids winning only at the end", () => {
  it("safe zone (tricks 1-11): leads the highest card, not the lowest", () => {
    const state: GameState = {
      ...createGame(DEFAULT_GAME_RULES, 0),
      phase: "playing",
      handType: "noLastTwo",
      completedTricks: Array.from({ length: 5 }, (_, i) => dummyTrick((i % 4) as PlayerIndex)),
      hands: { 0: [card("S", 2), card("H", 9), card("D", 5)], 1: [], 2: [], 3: [] },
      currentTrick: [],
      currentTurn: 0,
    };
    expect(chooseCard(state, 0)).toEqual(card("H", 9));
  });

  it("safe zone (tricks 1-11): plays the highest card even when following suit and it would win", () => {
    const state: GameState = {
      ...createGame(DEFAULT_GAME_RULES, 0),
      phase: "playing",
      handType: "noLastTwo",
      completedTricks: Array.from({ length: 8 }, (_, i) => dummyTrick((i % 4) as PlayerIndex)),
      hands: { 0: [], 1: [card("S", 3), card("S", 6), card("S", 10)], 2: [], 3: [] },
      currentTrick: [{ player: 0, card: card("S", 7) }],
      currentTurn: 1,
    };
    // Normal negative-hand logic would duck under with S3 (safe); the safe-zone override should
    // instead dump the highest legal card (S10) since winning this trick costs nothing.
    expect(chooseCard(state, 1)).toEqual(card("S", 10));
  });

  it("danger zone (tricks 12-13): reverts to the normal avoid-winning strategy, shedding the most dangerous safe card", () => {
    const state: GameState = {
      ...createGame(DEFAULT_GAME_RULES, 0),
      phase: "playing",
      handType: "noLastTwo",
      completedTricks: Array.from({ length: 11 }, (_, i) => dummyTrick((i % 4) as PlayerIndex)), // trick 12 about to be played
      hands: { 0: [], 1: [card("S", 3), card("S", 6), card("S", 10)], 2: [], 3: [] },
      currentTrick: [{ player: 0, card: card("S", 7) }],
      currentTurn: 1,
    };
    // S3 and S6 are both safe (under S7); S10 would win. Most dangerous of the safe two is S6.
    expect(chooseCard(state, 1)).toEqual(card("S", 6));
  });
});

describe('chooseCard — "normal" difficulty leading, card-tracking aware', () => {
  it("leads a master card over a merely-higher-ranked but unproven one", () => {
    // Spades' Ace, King, and Queen are already gone — the 10 of spades is now the highest
    // remaining spade (a "master"), even though the King of Diamonds outranks it numerically and
    // is what the flat highest-card heuristic would pick instead.
    const state: GameState = withPositiveSetup(
      {
        ...createGame(DEFAULT_GAME_RULES, 0),
        phase: "playing",
        completedTricks: [
          dummyTrickOf([
            { player: 1, card: card("S", 14) },
            { player: 2, card: card("S", 13) },
            { player: 3, card: card("S", 12) },
            { player: 0, card: card("S", 11) },
          ]),
        ],
        hands: { 0: [card("S", 10), card("D", 13)], 1: [], 2: [], 3: [] },
        currentTrick: [],
        currentTurn: 0,
      },
      null,
    );
    expect(chooseCard(state, 0, "normal")).toEqual(card("S", 10));
  });

  it("does NOT lead a merely-decent (length 3) trump holding when a higher trump is still unseen", () => {
    // Trump is hearts. The bot holds the King of hearts plus two low hearts (length 3) — a
    // decent holding, but not proven control: the Ace of hearts is neither played nor in the
    // bot's own hand, so it's still out there and could beat the King. No real player would risk
    // leading the King away here; the bot should lead a safe side card instead.
    const state: GameState = withPositiveSetup(
      {
        ...createGame(DEFAULT_GAME_RULES, 0),
        phase: "playing",
        hands: {
          0: [card("H", 13), card("H", 5), card("H", 2), card("S", 9), card("D", 7)],
          1: [],
          2: [],
          3: [],
        },
        currentTrick: [],
        currentTurn: 0,
      },
      "H",
    );
    const led = chooseCard(state, 0, "normal");
    expect(led).not.toEqual(card("H", 13));
    expect(led).toEqual(card("S", 9));
  });

  it("leads trump to draw it out when holding genuine control length (5+), even with no proven master", () => {
    // Trump is hearts. The bot holds 5 low/mid hearts — no King or Ace, so no master — but 5 of a
    // 13-card suit is well above the ~3.25-per-hand average (opponents combined hold at most 8),
    // enough real control to justify leading trump over a higher-ranked side card.
    const state: GameState = withPositiveSetup(
      {
        ...createGame(DEFAULT_GAME_RULES, 0),
        phase: "playing",
        hands: {
          0: [card("H", 2), card("H", 4), card("H", 6), card("H", 8), card("H", 9), card("S", 13)],
          1: [],
          2: [],
          3: [],
        },
        currentTrick: [],
        currentTurn: 0,
      },
      "H",
    );
    expect(chooseCard(state, 0, "normal")).toEqual(card("H", 9));
  });

  it('"easy" difficulty (heuristic path, no randomness triggered) still leads the flat-highest card', () => {
    const state: GameState = withPositiveSetup(
      {
        ...createGame(DEFAULT_GAME_RULES, 0),
        phase: "playing",
        hands: { 0: [card("H", 9), card("H", 10), card("H", 11), card("S", 13)], 1: [], 2: [], 3: [] },
        currentTrick: [],
        currentTurn: 0,
      },
      "H",
    );
    const neverRandom = () => 0.99; // stays above EASY_RANDOMNESS's threshold every time
    expect(chooseCard(state, 0, "easy", neverRandom)).toEqual(card("S", 13));
  });

  it('"easy" difficulty occasionally overrides the heuristic with a uniformly random legal card', () => {
    const state: GameState = withPositiveSetup(
      {
        ...createGame(DEFAULT_GAME_RULES, 0),
        phase: "playing",
        hands: { 0: [card("S", 9), card("H", 2), card("D", 13)], 1: [], 2: [], 3: [] },
        currentTrick: [],
        currentTurn: 0,
      },
      null,
    );
    const alwaysRandomFirst = () => 0; // triggers the random branch, then picks index 0
    expect(chooseCard(state, 0, "easy", alwaysRandomFirst)).toEqual(card("S", 9));
  });
});

describe("chooseCard — positive hands, not leading", () => {
  it("takes the cheapest winning card when one is available", () => {
    const state: GameState = withPositiveSetup(
      {
        ...createGame(DEFAULT_GAME_RULES, 0),
        phase: "playing",
        hands: { 0: [], 1: [card("S", 8), card("S", 13)], 2: [], 3: [] },
        currentTrick: [{ player: 0, card: card("S", 7) }],
        currentTurn: 1,
      },
      null,
    );
    // Both S8 and S13 currently win (beat S7); the cheapest is S8.
    expect(chooseCard(state, 1)).toEqual(card("S", 8));
  });

  it("ducks with the lowest card when it can't currently win", () => {
    const state: GameState = withPositiveSetup(
      {
        ...createGame(DEFAULT_GAME_RULES, 0),
        phase: "playing",
        hands: { 0: [], 1: [card("S", 3), card("S", 6)], 2: [], 3: [] },
        currentTrick: [{ player: 0, card: card("S", 10) }],
        currentTurn: 1,
      },
      null,
    );
    expect(chooseCard(state, 1)).toEqual(card("S", 3));
  });

  it("only has one legal card: returns it without evaluating anything", () => {
    const state: GameState = withPositiveSetup(
      {
        ...createGame(DEFAULT_GAME_RULES, 0),
        phase: "playing",
        hands: { 0: [], 1: [card("S", 9)], 2: [], 3: [] },
        currentTrick: [{ player: 0, card: card("S", 7) }],
        currentTurn: 1,
      },
      null,
    );
    expect(chooseCard(state, 1)).toEqual(card("S", 9));
  });
});
