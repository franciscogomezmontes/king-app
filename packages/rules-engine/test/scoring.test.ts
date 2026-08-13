import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { AuctionResult } from "../src/auction";
import { createDeck, shuffle } from "../src/deck";
import {
  NEGATIVE_GAME_TOTAL,
  NEGATIVE_HAND_EXPECTED_COUNT,
  NEGATIVE_HAND_TOTAL,
  NEGATIVE_HAND_UNIT,
  POSITIVE_HAND_EXPECTED_TRICKS,
  POSITIVE_HAND_TOTAL,
  scoreNegativeHand,
  scoreNegativeHandFromCounts,
  scorePositiveHand,
  scorePositiveHandFromTricks,
  validateHandCounts,
} from "../src/scoring";
import { Card, HandResult, NEGATIVE_HAND_ORDER, PlayerIndex } from "../src/types";

/**
 * An arbitrary composition of `total` into 4 non-negative parts (one per player) — three cut
 * points in [0, total], sorted, whose gaps are the four counts. Used to property-test the
 * count-based scoring functions across every valid way 13 tricks/13 hearts/8 gentlemen/etc. could
 * have been split across 4 players, the same way `buildHandResult` covers every valid deal below.
 */
function countsComposition(total: number): fc.Arbitrary<Record<PlayerIndex, number>> {
  return fc
    .tuple(
      fc.integer({ min: 0, max: total }),
      fc.integer({ min: 0, max: total }),
      fc.integer({ min: 0, max: total }),
    )
    .map(([x, y, z]) => {
      const [a, b, c] = [x, y, z].sort((p, q) => p - q);
      return { 0: a, 1: b - a, 2: c - b, 3: total - c } as Record<PlayerIndex, number>;
    });
}

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

function zeroCounts(): Record<PlayerIndex, number> {
  return { 0: 0, 1: 0, 2: 0, 3: 0 };
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

describe("scorePositiveHand — auction transfer zero-sum invariant", () => {
  for (const direction of ["up", "down"] as const) {
    it(`direction="${direction}" still totals ${POSITIVE_HAND_TOTAL} when an auction bid transfers tricks`, () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 2 ** 31 - 1 }),
          fc.integer({ min: 0, max: 3 }),
          fc.integer({ min: 1, max: 3 }),
          // Deliberately covers bids below, within, and above the 0-13 range a real trick count
          // can take, since a losing bidder can be "bid > actual tricks captured".
          fc.integer({ min: -5, max: 18 }),
          (seed, dealer, offset, bid) => {
            const hand = buildHandResult(seed);
            const winner = ((dealer + offset) % 4) as PlayerIndex;
            const auction: AuctionResult = { dealer: dealer as PlayerIndex, winner, bid };
            const scores = scorePositiveHand(hand, direction, auction);
            expect(sum(scores)).toBe(POSITIVE_HAND_TOTAL);
          },
        ),
        { numRuns: 200 },
      );
    });
  }

  it("an auction winner who wins the most tricks can still score below a non-auction hand's dealer share", () => {
    // Concrete illustration of the transfer, matching CLAUDE.md: dealer captures 2 tricks but the
    // auction winner bid (and is credited with transferring) 6, landing on the dealer's tally.
    const hand: HandResult = [];
    const trickCounts: Record<PlayerIndex, number> = { 0: 2, 1: 8, 2: 2, 3: 1 };
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
    const auction: AuctionResult = { dealer: 0, winner: 1, bid: 6 };
    const scores = scorePositiveHand(hand, "up", auction);
    // dealer: 2 + 6 = 8 tricks * 25 = 200; winner: 8 - 6 = 2 tricks * 25 = 50.
    expect(scores).toEqual({ 0: 200, 1: 50, 2: 50, 3: 25 });
    expect(sum(scores)).toBe(POSITIVE_HAND_TOTAL);
  });
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

describe("scoreNegativeHandFromCounts — Scorekeeper mode's count-entry scoring path", () => {
  it("NEGATIVE_HAND_TOTAL always equals NEGATIVE_HAND_UNIT * NEGATIVE_HAND_EXPECTED_COUNT (the two tables can't drift apart)", () => {
    for (const handType of NEGATIVE_HAND_ORDER) {
      expect(NEGATIVE_HAND_UNIT[handType] * NEGATIVE_HAND_EXPECTED_COUNT[handType]).toBe(
        NEGATIVE_HAND_TOTAL[handType],
      );
    }
  });

  for (const handType of NEGATIVE_HAND_ORDER) {
    it(`${handType} always totals ${NEGATIVE_HAND_TOTAL[handType]} for any valid count split`, () => {
      fc.assert(
        fc.property(countsComposition(NEGATIVE_HAND_EXPECTED_COUNT[handType]), (counts) => {
          const scores = scoreNegativeHandFromCounts(handType, counts);
          expect(sum(scores)).toBe(NEGATIVE_HAND_TOTAL[handType]);
        }),
        { numRuns: 200 },
      );
    });
  }

  it("matches the family's King Scorekeeper.xlsx 'No Bazas' (No Tricks) reference row directly: 4/4/2/3 -> -80/-80/-40/-60", () => {
    const scores = scoreNegativeHandFromCounts("noTricks", { 0: 4, 1: 4, 2: 2, 3: 3 });
    expect(scores).toEqual({ 0: -80, 1: -80, 2: -40, 3: -60 });
  });

  it("a zero count scores plain 0, not -0 (an exact-equality check on a zero-trick player must not fail)", () => {
    const scores = scoreNegativeHandFromCounts("noKingOfHearts", { 0: 0, 1: 0, 2: 1, 3: 0 });
    expect(Object.is(scores[0], 0)).toBe(true);
    expect(Object.is(scores[0], -0)).toBe(false);
  });

  it("agrees with the HandResult-based scoreNegativeHand for the same captured cards, across hand types", () => {
    // Cross-checks the two entry points against independently-computed counts (not just trusting
    // that scoreNegativeHand happens to call scoreNegativeHandFromCounts internally).
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 2 ** 31 - 1 }), (seed) => {
        const hand = buildHandResult(seed);
        const players: PlayerIndex[] = [0, 1, 2, 3];

        const heartsCounts = zeroCounts();
        const gentlemenCounts = zeroCounts();
        const ladyCounts = zeroCounts();
        const kingOfHeartsCounts = zeroCounts();
        for (const player of players) {
          const won = hand.filter((t) => t.winner === player).flatMap((t) => t.plays.map((p) => p.card));
          heartsCounts[player] = won.filter((c) => c.suit === "H").length;
          gentlemenCounts[player] = won.filter((c) => c.rank === 13 || c.rank === 11).length;
          ladyCounts[player] = won.filter((c) => c.rank === 12).length;
          kingOfHeartsCounts[player] = won.some((c) => c.suit === "H" && c.rank === 13) ? 1 : 0;
        }

        expect(scoreNegativeHand("noHearts", hand)).toEqual(
          scoreNegativeHandFromCounts("noHearts", heartsCounts),
        );
        expect(scoreNegativeHand("noGentlemen", hand)).toEqual(
          scoreNegativeHandFromCounts("noGentlemen", gentlemenCounts),
        );
        expect(scoreNegativeHand("noLady", hand)).toEqual(scoreNegativeHandFromCounts("noLady", ladyCounts));
        expect(scoreNegativeHand("noKingOfHearts", hand)).toEqual(
          scoreNegativeHandFromCounts("noKingOfHearts", kingOfHeartsCounts),
        );
      }),
      { numRuns: 200 },
    );
  });
});

describe("scorePositiveHandFromTricks — Scorekeeper mode's count-entry scoring path", () => {
  for (const direction of ["up", "down"] as const) {
    it(`direction="${direction}" always totals ${POSITIVE_HAND_TOTAL} for any valid trick split`, () => {
      fc.assert(
        fc.property(countsComposition(POSITIVE_HAND_EXPECTED_TRICKS), (tricksWon) => {
          const scores = scorePositiveHandFromTricks(tricksWon, direction);
          expect(sum(scores)).toBe(POSITIVE_HAND_TOTAL);
        }),
        { numRuns: 200 },
      );
    });
  }

  it("matches the family's King Scorekeeper.xlsx hand I reference row directly: 3/2/5/3 tricks -> 75/50/125/75", () => {
    const scores = scorePositiveHandFromTricks({ 0: 3, 1: 2, 2: 5, 3: 3 });
    expect(scores).toEqual({ 0: 75, 1: 50, 2: 125, 3: 75 });
  });

  it("agrees with the HandResult-based scorePositiveHand for the same captured tricks (no auction)", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 2 ** 31 - 1 }), (seed) => {
        const hand = buildHandResult(seed);
        const tricksWon = zeroCounts();
        for (const trick of hand) tricksWon[trick.winner] += 1;
        expect(scorePositiveHand(hand, "up")).toEqual(scorePositiveHandFromTricks(tricksWon, "up"));
        expect(scorePositiveHand(hand, "down")).toEqual(scorePositiveHandFromTricks(tricksWon, "down"));
      }),
      { numRuns: 200 },
    );
  });
});

describe("validateHandCounts — the xlsx's OK/Revisar check", () => {
  for (const handType of NEGATIVE_HAND_ORDER) {
    const expectedTotal = NEGATIVE_HAND_EXPECTED_COUNT[handType];

    it(`${handType}: counts summing to ${expectedTotal} are ok`, () => {
      const result = validateHandCounts(handType, { 0: expectedTotal, 1: 0, 2: 0, 3: 0 });
      expect(result).toEqual({ ok: true, actualTotal: expectedTotal, expectedTotal });
    });

    it(`${handType}: counts summing to anything else are not ok ("Revisar, NO suma ${expectedTotal}")`, () => {
      const result = validateHandCounts(handType, { 0: expectedTotal + 1, 1: 0, 2: 0, 3: 0 });
      expect(result).toEqual({ ok: false, actualTotal: expectedTotal + 1, expectedTotal });
    });
  }

  it(`positive: counts summing to ${POSITIVE_HAND_EXPECTED_TRICKS} are ok`, () => {
    const result = validateHandCounts("positive", { 0: 13, 1: 0, 2: 0, 3: 0 });
    expect(result).toEqual({ ok: true, actualTotal: 13, expectedTotal: 13 });
  });

  it("positive: counts summing to anything else are not ok", () => {
    const result = validateHandCounts("positive", { 0: 12, 1: 0, 2: 0, 3: 0 });
    expect(result).toEqual({ ok: false, actualTotal: 12, expectedTotal: 13 });
  });
});
