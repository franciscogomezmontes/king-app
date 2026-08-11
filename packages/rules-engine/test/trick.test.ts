import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { createDeck, shuffle } from "../src/deck";
import { rankValue } from "../src/rank";
import { resolveTrick } from "../src/trick";
import { Card, DEFAULT_RULE_SET, PlayerIndex, RuleSet, Suit, SUITS, Trick } from "../src/types";

function card(suit: Suit, rank: Card["rank"]): Card {
  return { suit, rank };
}

function plays(cards: Card[]): Trick["plays"] {
  return cards.map((c, i) => ({ player: i as PlayerIndex, card: c }));
}

// Same small deterministic PRNG as scoring.test.ts's buildHandResult, so property-test failures
// reproduce from the seed alone.
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

describe("resolveTrick — targeted cases", () => {
  it("no trump: highest card of the led suit wins", () => {
    const winner = resolveTrick(
      plays([card("H", 7), card("H", 12), card("D", 14), card("H", 3)]),
      null,
      DEFAULT_RULE_SET,
    );
    expect(winner).toBe(1); // H12, the highest heart (led suit)
  });

  it("a trump beats even the highest card of the led suit", () => {
    const winner = resolveTrick(
      plays([card("H", 14), card("H", 5), card("S", 2), card("H", 9)]),
      "S",
      DEFAULT_RULE_SET,
    );
    expect(winner).toBe(2); // the only spade (trump) beats the ace of hearts
  });

  it("with multiple trumps played, the highest trump wins, not the first one", () => {
    const winner = resolveTrick(
      plays([card("H", 5), card("S", 4), card("D", 14), card("S", 9)]),
      "S",
      DEFAULT_RULE_SET,
    );
    expect(winner).toBe(3); // S9 beats S4
  });

  it("no-trump hand: a card outside the led suit can never win, even an ace", () => {
    const winner = resolveTrick(
      plays([card("H", 2), card("D", 14), card("H", 9), card("C", 13)]),
      null,
      DEFAULT_RULE_SET,
    );
    expect(winner).toBe(2); // H9, highest heart — the D14 and C13 are just discards here
  });

  it("Backwards flips who wins, both within the led suit and within trump", () => {
    const backwards: RuleSet = { ...DEFAULT_RULE_SET, backwards: true };

    const ledSuitWinner = resolveTrick(plays([card("H", 7), card("H", 2), card("H", 9)]), null, backwards);
    expect(ledSuitWinner).toBe(1); // H2 is now the "highest" heart

    const trumpWinner = resolveTrick(
      plays([card("H", 5), card("S", 10), card("S", 3)]),
      "S",
      backwards,
    );
    expect(trumpWinner).toBe(2); // S3 beats S10 under backwards
  });

  it("throws on an empty trick", () => {
    expect(() => resolveTrick([], null, DEFAULT_RULE_SET)).toThrow();
  });

  it("defaults (no ruleSet arg) match plain non-backwards resolution", () => {
    const winner = resolveTrick(plays([card("H", 7), card("H", 12), card("H", 3)]), null);
    expect(winner).toBe(1);
  });
});

describe("resolveTrick — property tests", () => {
  it("the winning card is always suited to the led suit, unless a trump was played, in which case it's always the highest trump", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 2 ** 31 - 1 }),
        fc.constantFrom<Suit | null>(null, ...SUITS),
        fc.boolean(),
        (seed, trumpSuit, backwards) => {
          const random = mulberry32(seed);
          const deck = shuffle(createDeck(), random);
          const cards = deck.slice(0, 4);
          const trickPlays = plays(cards);
          const ledSuit = cards[0].suit;
          const ruleSet: RuleSet = { ...DEFAULT_RULE_SET, backwards };

          const winner = resolveTrick(trickPlays, trumpSuit, ruleSet);
          const winningCard = trickPlays.find((p) => p.player === winner)!.card;

          const trumpsInTrick = trumpSuit !== null ? cards.filter((c) => c.suit === trumpSuit) : [];
          const contendingSuit = trumpsInTrick.length > 0 ? trumpSuit : ledSuit;
          expect(winningCard.suit).toBe(contendingSuit);

          const contenders = cards.filter((c) => c.suit === contendingSuit);
          const maxRankValue = Math.max(...contenders.map((c) => rankValue(c.rank, backwards)));
          expect(rankValue(winningCard.rank, backwards)).toBe(maxRankValue);
        },
      ),
      { numRuns: 200 },
    );
  });
});
