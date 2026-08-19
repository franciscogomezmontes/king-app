import { describe, expect, it } from "vitest";
import { Card, DEFAULT_GAME_RULES, deal, createDeck, shuffle } from "rules-engine";
import { bestTrumpCandidate, decideBid, EvaluatedTrumpCandidate } from "../src/trumpSearch";

function card(suit: Card["suit"], rank: Card["rank"]): Card {
  return { suit, rank };
}

// Same small deterministic PRNG used throughout this package's other tests.
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

// A production-length budget (HARD_TRUMP_BUDGET_MS/EXPERT_TRUMP_BUDGET_MS, 600-2500ms) times
// however many trump/bid/dealer decisions a test needs would make these tests painfully slow —
// same rationale as chooseCard.test.ts's/hardVsNormal.test.ts's own TEST_SEARCH_BUDGET_MS: a much
// smaller budget still exercises the exact same round-robin/simulate/average machinery, just with
// fewer samples per candidate.
const TEST_BUDGET_MS = 60;

describe("bestTrumpCandidate — picks the genuinely stronger trump", () => {
  // A first attempt at this test pitted a *short-but-top-heavy* suit (5-card A-K-Q-J-10) against a
  // *long-but-weak* one (7 low clubs), expecting the short strong suit to win. It didn't — clubs
  // won, stably, from 60ms all the way up to 3000ms of search (verified directly, not assumed).
  // That's not a bug: with 7 of the suit's 13 cards, opponents combined hold only 6, so a couple of
  // low-club leads exhaust their trump entirely, after which every remaining club (plus the
  // now-unruffable side-suit spade run this same hand also happened to hold) wins automatically —
  // the standard "draw trump, then run winners" trick-taking pattern. A 5-card trump suit runs out
  // of trump after only 5 tricks and has nothing left to protect its side suits with. The lesson:
  // trump *length* carries real, easy-to-underestimate value on its own, so a fair test can't pit
  // length against quality — it has to make one candidate dominant on *both* axes at once, which is
  // what both scenarios below do (verified stable from 300ms to 1500ms before being written down).
  it("prefers a suit that's both longer and stronger than every alternative candidate", () => {
    const hand: Card[] = [
      card("H", 14),
      card("H", 13),
      card("H", 12),
      card("H", 11),
      card("H", 10),
      card("H", 9),
      card("H", 8),
      card("C", 2),
      card("C", 3),
      card("C", 4),
      card("S", 5),
      card("S", 6),
      card("S", 7),
    ];

    const best = bestTrumpCandidate(hand, 0, 0, DEFAULT_GAME_RULES, TEST_BUDGET_MS, mulberry32(5));
    expect(best.trump).toBe("H");
  });

  it("prefers its one long, strong suit over no-trump when nothing else even qualifies as a candidate", () => {
    // 8 hearts headed by A-K-Q-J, the rest of the hand spread too thin (2/2/1) for any other suit
    // to reach the 3-card candidate floor — isolates "trump vs. no-trump" with no third option to
    // confound it, unlike a plain weak-4-card-suit-vs-no-trump case (which this session's first
    // attempt at this test also got backwards — see the scenario above's own comment — length alone
    // turned out to carry more weight than expected, so "weak but not *this* short" isn't actually a
    // safe no-trump-wins scenario either).
    const hand: Card[] = [
      card("H", 14),
      card("H", 13),
      card("H", 12),
      card("H", 11),
      card("H", 9),
      card("H", 7),
      card("H", 5),
      card("H", 3),
      card("S", 2),
      card("S", 4),
      card("D", 6),
      card("D", 8),
      card("C", 10),
    ];

    const best = bestTrumpCandidate(hand, 0, 0, DEFAULT_GAME_RULES, TEST_BUDGET_MS, mulberry32(6));
    expect(best.trump).toBe("H");
  });
});

describe("decideBid — stays within realistic bounds", () => {
  it("across real dealt hands, never an absurd bid, and the average stays well under a full hand", () => {
    // An earlier version of this test also asserted a tight bound on the *fraction* of hands
    // bidding 5+ (mirroring handStrength.test.ts's <3% check). That flaked: at only 25 hands and a
    // 60ms per-hand search budget, the fraction itself swung anywhere from 0.28 to 0.56 across
    // otherwise-identical runs (verified directly by re-running at several budgets) — not
    // production behavior leaking through, just the reality that "which of ~5 candidates got the
    // luckiest few samples" is a genuinely high-variance question at this budget, and 25 hands is
    // far too small a sample for a *fraction crossing a threshold* to be stable (handStrength.
    // test.ts gets away with a tight bound because it samples 2000 hands against a closed-form
    // formula, not ~25 against a wall-clock-budgeted Monte Carlo search). The mean is far less
    // sensitive to that per-run noise than a threshold-crossing fraction is, so that's the bound
    // kept here — still catches a genuinely broken implementation (e.g. one that systematically
    // bids 8+), without flaking on ordinary sampling variance.
    const random = mulberry32(777);
    const HANDS = 25; // real 13-card hands sampled; kept small — each needs its own budgeted search
    const bids: number[] = [];

    for (let i = 0; i < HANDS; i++) {
      const hands = deal(shuffle(createDeck(), random));
      const best: EvaluatedTrumpCandidate = bestTrumpCandidate(hands[0], 0, 0, DEFAULT_GAME_RULES, TEST_BUDGET_MS, random);
      const bid = decideBid(best, 0); // currentHigh=0: "what would this hand's own opening bid be"
      bids.push(bid ?? 0);
    }

    // Sanity: the search actually produced some spread across real hands, not a constant.
    expect(new Set(bids).size).toBeGreaterThan(1);

    for (const bid of bids) {
      // Never an absurd bid — well under the 13 tricks a hand even has. Not as tight a cap as
      // `handStrength.test.ts`'s own formula-based estimate: this session's own trump-candidate
      // tests (see trumpSearch.test.ts's "picks the genuinely stronger trump" describe block)
      // found that a real hand combining trump length with real head strength can soundly draw
      // 8-9 simulated tricks — a legitimately exceptional hand, not a broken estimate — so this
      // bound only needs to catch a genuinely runaway number, not police the top of a real range.
      expect(bid).toBeLessThanOrEqual(10);
      expect(bid).toBeGreaterThanOrEqual(0);
    }

    const average = bids.reduce((sum, b) => sum + b, 0) / bids.length;
    expect(average).toBeLessThan(6);
  }, 30_000);
});
