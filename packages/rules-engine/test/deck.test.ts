import { describe, expect, it } from "vitest";
import { createDeck, deal, shuffle } from "../src/deck";

describe("createDeck", () => {
  it("has 52 unique cards", () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
    const unique = new Set(deck.map((c) => `${c.suit}${c.rank}`));
    expect(unique.size).toBe(52);
  });
});

describe("shuffle", () => {
  it("does not mutate the input and preserves all cards", () => {
    const deck = createDeck();
    const shuffled = shuffle(deck, () => 0.42);
    expect(deck).toHaveLength(52); // original untouched
    expect(shuffled).toHaveLength(52);
    const originalKeys = new Set(deck.map((c) => `${c.suit}${c.rank}`));
    const shuffledKeys = new Set(shuffled.map((c) => `${c.suit}${c.rank}`));
    expect(shuffledKeys).toEqual(originalKeys);
  });
});

describe("deal", () => {
  it("deals exactly 13 cards to each of the 4 players, covering the whole deck", () => {
    const hands = deal(createDeck());
    for (const player of [0, 1, 2, 3] as const) {
      expect(hands[player]).toHaveLength(13);
    }
    const allDealt = [...hands[0], ...hands[1], ...hands[2], ...hands[3]];
    expect(allDealt).toHaveLength(52);
    const unique = new Set(allDealt.map((c) => `${c.suit}${c.rank}`));
    expect(unique.size).toBe(52);
  });

  it("rejects a deck that isn't exactly 52 cards", () => {
    expect(() => deal(createDeck().slice(0, 51))).toThrow();
  });
});
