import { describe, expect, it } from "vitest";
import { createDeck, deal, shuffle } from "rules-engine";
import { estimateTricks } from "../src/handStrength";

// Same small deterministic PRNG used throughout this package's other tests, so a failure
// reproduces from the seed alone.
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

describe("estimateTricks — bid distribution against real-table norms", () => {
  it("produces a distribution where 3 is a strong bid, 4 is rare, and 5+ is a tiny minority", () => {
    const random = mulberry32(2024);
    const counts = new Map<number, number>();
    const DEALS = 500; // 500 deals x 4 hands = 2000 real 13-card hand samples

    for (let i = 0; i < DEALS; i++) {
      const hands = deal(shuffle(createDeck(), random));
      for (const seat of [0, 1, 2, 3] as const) {
        const estimate = estimateTricks(hands[seat]);
        counts.set(estimate, (counts.get(estimate) ?? 0) + 1);
      }
    }

    const total = DEALS * 4;
    const fractionAtLeast = (n: number) =>
      [...counts.entries()].filter(([estimate]) => estimate >= n).reduce((sum, [, count]) => sum + count, 0) / total;

    const fourOrMore = fractionAtLeast(4);
    const fiveOrMore = fractionAtLeast(5);

    // Sanity: real hands actually produced some spread, not every hand collapsing to the same
    // estimate (which would make the fractions below trivially true for the wrong reason).
    expect(counts.size).toBeGreaterThan(3);

    // 4 is rare — a small minority of real 13-card hands.
    expect(fourOrMore).toBeLessThan(0.15);
    // 5+ is a tiny fraction, essentially never seen outside a truly exceptional hand.
    expect(fiveOrMore).toBeLessThan(0.03);
  });
});
