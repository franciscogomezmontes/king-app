import { describe, expect, it } from "vitest";
import { legalPlays } from "../src/legality";
import { Card, DEFAULT_RULE_SET, RuleSet, Suit } from "../src/types";

function card(suit: Suit, rank: Card["rank"]): Card {
  return { suit, rank };
}

describe("legalPlays — base rules (mandatoryKilling off)", () => {
  it("leading (no cards played this trick): any card is legal", () => {
    const hand = [card("C", 2), card("H", 5), card("D", 9)];
    expect(legalPlays(hand, [], null, DEFAULT_RULE_SET)).toEqual(hand);
  });

  it("must follow suit if able", () => {
    const hand = [card("C", 2), card("H", 5), card("C", 9)];
    const trick = [card("C", 7)];
    expect(legalPlays(hand, trick, null, DEFAULT_RULE_SET)).toEqual([card("C", 2), card("C", 9)]);
  });

  it("any card is legal if void in the led suit", () => {
    const hand = [card("H", 5), card("D", 9)];
    const trick = [card("C", 7)];
    expect(legalPlays(hand, trick, null, DEFAULT_RULE_SET)).toEqual(hand);
  });

  it("defaults (no ruleSet arg) match plain follow-suit behavior", () => {
    const hand = [card("C", 2), card("H", 5), card("C", 9)];
    const trick = [card("C", 7)];
    expect(legalPlays(hand, trick, null)).toEqual([card("C", 2), card("C", 9)]);
  });
});

describe("legalPlays — Mandatory Killing", () => {
  const ruleSet: RuleSet = { ...DEFAULT_RULE_SET, mandatoryKilling: true };

  it("must beat the highest led card if able", () => {
    const hand = [card("S", 10), card("S", 3), card("H", 2)];
    const trick = [card("S", 7)];
    expect(legalPlays(hand, trick, null, ruleSet)).toEqual([card("S", 10)]);
  });

  it("falls back to normal follow-suit if no held card can beat the highest led card", () => {
    const hand = [card("S", 3), card("S", 5), card("H", 2)];
    const trick = [card("S", 7)];
    expect(legalPlays(hand, trick, null, ruleSet)).toEqual([card("S", 3), card("S", 5)]);
  });

  it("compares against the highest led-suit card across all prior plays, not just the first", () => {
    // Spades led at 7, then raised to 9. An 8 doesn't beat the trick's actual high (9), even
    // though it would beat the opening lead (7) — only the 10 is a legal forced beat.
    const hand = [card("S", 8), card("S", 10), card("H", 2)];
    const trick = [card("S", 7), card("S", 9)];
    expect(legalPlays(hand, trick, null, ruleSet)).toEqual([card("S", 10)]);
  });

  it("void in led suit with trump in hand: must trump", () => {
    const hand = [card("C", 4), card("D", 9), card("S", 2)];
    const trick = [card("H", 7)];
    expect(legalPlays(hand, trick, "C", ruleSet)).toEqual([card("C", 4)]);
  });

  it("void in led suit and void in trump: free play", () => {
    const hand = [card("D", 9), card("S", 2)];
    const trick = [card("H", 7)];
    expect(legalPlays(hand, trick, "C", ruleSet)).toEqual(hand);
  });

  it("no-trump hand: void in led suit is always free play, even with killing on", () => {
    const hand = [card("D", 9), card("S", 2)];
    const trick = [card("H", 7)];
    expect(legalPlays(hand, trick, null, ruleSet)).toEqual(hand);
  });

  it("leading is unaffected by mandatory killing", () => {
    const hand = [card("C", 2), card("H", 5)];
    expect(legalPlays(hand, [], "C", ruleSet)).toEqual(hand);
  });
});

describe("legalPlays — Backwards (2 high, Ace low)", () => {
  it("flips which led-suit cards count as a 'beat'", () => {
    const hand = [card("D", 2), card("D", 14), card("D", 3)];
    const trick = [card("D", 8)];

    const normal: RuleSet = { ...DEFAULT_RULE_SET, mandatoryKilling: true, backwards: false };
    expect(legalPlays(hand, trick, null, normal)).toEqual([card("D", 14)]);

    const backwards: RuleSet = { ...DEFAULT_RULE_SET, mandatoryKilling: true, backwards: true };
    expect(legalPlays(hand, trick, null, backwards)).toEqual([card("D", 2), card("D", 3)]);
  });

  it("is independent of Mandatory Killing: with killing off, backwards changes nothing about legality", () => {
    const hand = [card("D", 2), card("D", 14), card("D", 3)];
    const trick = [card("D", 8)];
    const ruleSet: RuleSet = { ...DEFAULT_RULE_SET, mandatoryKilling: false, backwards: true };
    expect(legalPlays(hand, trick, null, ruleSet)).toEqual(hand);
  });
});
