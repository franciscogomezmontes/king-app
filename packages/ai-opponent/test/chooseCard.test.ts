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

function card(suit: Card["suit"], rank: Card["rank"]): Card {
  return { suit, rank };
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

describe("chooseCard — negative hands, following suit", () => {
  it("plays the lowest card that still avoids winning, when a safe option exists", () => {
    const state: GameState = {
      ...createGame(DEFAULT_GAME_RULES, 0),
      phase: "playing",
      handType: "noTricks",
      hands: { 0: [], 1: [card("S", 3), card("S", 6), card("S", 10)], 2: [], 3: [] },
      currentTrick: [{ player: 0, card: card("S", 7) }],
      currentTurn: 1,
    };
    // S3 and S6 are both safe (under S7); S10 would win. Lowest safe is S3.
    expect(chooseCard(state, 1)).toEqual(card("S", 3));
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

  it("danger zone (tricks 12-13): reverts to the normal avoid-winning strategy", () => {
    const state: GameState = {
      ...createGame(DEFAULT_GAME_RULES, 0),
      phase: "playing",
      handType: "noLastTwo",
      completedTricks: Array.from({ length: 11 }, (_, i) => dummyTrick((i % 4) as PlayerIndex)), // trick 12 about to be played
      hands: { 0: [], 1: [card("S", 3), card("S", 6), card("S", 10)], 2: [], 3: [] },
      currentTrick: [{ player: 0, card: card("S", 7) }],
      currentTurn: 1,
    };
    expect(chooseCard(state, 1)).toEqual(card("S", 3));
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
