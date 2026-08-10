import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { createDeck, shuffle } from "../src/deck";
import {
  NEGATIVE_GAME_TOTAL,
  NEGATIVE_HAND_TOTAL,
  POSITIVE_HAND_TOTAL,
  scoreNegativeHand,
  scorePositiveHand,
} from "../src/scoring";
import { Card, HandResult, NEGATIVE_HAND_ORDER, PlayerIndex } from "../src/types";

/**
 * Builds a real, valid completed hand: shuffles a full 52-card deck, deals it into 13 tricks
 * of 4 cards (one per player), and assigns each trick's winner arbitrarily via the provided
 * winner picker. This is the property-test workhorse: because every card in the deck is
 * accounted for exactly once, the zero-sum invariants are meaningful, not tautological.
 */
function buildHandResult(seed: number): HandResult {
  let s = seed;
  const random = () => {
    // small deterministic PRNG (mulberry32) so fast-check seeds reproduce failures
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const deck = shuffle(createDeck(), random);
  const tricks: HandResult = [];
  for (let i = 0; i < 13; i++) {
    const cards = deck.slice(i * 4, i * 4 + 4);
    const plays = cards.map((card: Card, p: number) => ({
      player: ((i + p) % 4) as PlayerIndex,
      card,
    }));
    const winner = plays[Math.floor(random() * 4)].player;
    tricks.push({ plays, winner });
  }
  return tricks;
}

function sum(scores: Record<PlayerIndex, number>): number {
  return scores[0] + scores[1] + scores[2] + scores[3];
}

describe("scoreNegativeHand — zero-sum invariant", () => {
  for (const handType of NEGATIVE_HAND_ORDER) {
    it(`${handType} always totals ${NEGATIVE_HAND_TOTAL[handType]} across all 4 players`, () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 2 ** 31 - 1 }), (seed) => {
          const hand = buildHandResult(seed);
          const scores = scoreNegativeHand(handType, hand);
          expect(sum(scores)).toBe(NEGATIVE_HAND_TOTAL[handType]);
        }),
        { numRuns: 200 },
      );
    });
  }

  it("all six negative hands together total -1300 (matches the doc and the family's spreadsheet)", () => {
    expect(NEGATIVE_GAME_TOTAL).toBe(-1300);
  });
});

describe("scorePositiveHand — zero-sum invariant", () => {
  for (const direction of ["up", "down"] as const) {
    it(`direction="${direction}" always totals ${POSITIVE_HAND_TOTAL} across all 4 players, regardless of trick distribution`, () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 2 ** 31 - 1 }), (seed) => {
          const hand = buildHandResult(seed);
          const scores = scorePositiveHand(hand, direction);
          expect(sum(scores)).toBe(POSITIVE_HAND_TOTAL);
        }),
        { numRuns: 200 },
      );
    });
  }
});

describe("scoreNegativeHand — targeted unit cases", () => {
  it("noKingOfHearts: only the player who captured K♥ is penalized, exactly -160", () => {
    const hand: HandResult = [
      {
        plays: [
          { player: 0, card: { suit: "C", rank: 2 } },
          { player: 1, card: { suit: "D", rank: 3 } },
          { player: 2, card: { suit: "H", rank: 13 } }, // K♥
          { player: 3, card: { suit: "C", rank: 4 } },
        ],
        winner: 2,
      },
    ];
    const scores = scoreNegativeHand("noKingOfHearts", hand);
    expect(scores).toEqual({ 0: 0, 1: 0, 2: -160, 3: 0 });
  });

  it("noGentlemen: counts both kings and jacks, not just one rank", () => {
    const hand: HandResult = [
      {
        // Trick 1: player 0 captures K♣ (a "gentleman")
        plays: [
          { player: 0, card: { suit: "C", rank: 13 } }, // K♣
          { player: 1, card: { suit: "C", rank: 2 } },
          { player: 2, card: { suit: "C", rank: 3 } },
          { player: 3, card: { suit: "C", rank: 4 } },
        ],
        winner: 0,
      },
      {
        // Trick 2: player 0 also captures J♦ (also a "gentleman")
        plays: [
          { player: 1, card: { suit: "D", rank: 2 } },
          { player: 2, card: { suit: "D", rank: 3 } },
          { player: 3, card: { suit: "D", rank: 4 } },
          { player: 0, card: { suit: "D", rank: 11 } }, // J♦
        ],
        winner: 0,
      },
    ];
    const scores = scoreNegativeHand("noGentlemen", hand);
    expect(scores[0]).toBe(-60); // K + J = 2 cards * -30
  });

  it("matches the family's King Scorekeeper.xlsx 'No Bazas' (No Tricks) reference row: 4/4/2/3 tricks -> -80/-80/-40/-60", () => {
    const trickCounts: Record<PlayerIndex, number> = { 0: 4, 1: 4, 2: 2, 3: 3 };
    const hand: HandResult = [];
    (Object.keys(trickCounts) as unknown as PlayerIndex[]).forEach((player) => {
      for (let i = 0; i < trickCounts[player]; i++) {
        hand.push({
          plays: [
            { player: 0, card: { suit: "C", rank: 2 } },
            { player: 1, card: { suit: "C", rank: 3 } },
            { player: 2, card: { suit: "C", rank: 4 } },
            { player: 3, card: { suit: "C", rank: 5 } },
          ],
          winner: player,
        });
      }
    });
    const scores = scoreNegativeHand("noTricks", hand);
    expect(scores).toEqual({ 0: -80, 1: -80, 2: -40, 3: -60 });
  });
});
