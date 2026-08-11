import { describe, expect, it } from "vitest";
import { rotateLeftEachHand, seatAfterDealer } from "../../src/game/dealer";
import { PlayerIndex } from "../../src/types";

describe("rotateLeftEachHand", () => {
  it("cycles 0->1->2->3->0 across all 10 hand indices, for every first dealer", () => {
    for (const firstDealer of [0, 1, 2, 3] as PlayerIndex[]) {
      for (let handIndex = 0; handIndex < 10; handIndex++) {
        const expected = ((firstDealer + handIndex) % 4) as PlayerIndex;
        expect(rotateLeftEachHand(handIndex, firstDealer)).toBe(expected);
      }
    }
  });

  it("returns the first dealer unchanged at handIndex 0", () => {
    for (const firstDealer of [0, 1, 2, 3] as PlayerIndex[]) {
      expect(rotateLeftEachHand(0, firstDealer)).toBe(firstDealer);
    }
  });
});

describe("seatAfterDealer", () => {
  it("returns the next seat, wrapping 3 -> 0", () => {
    expect(seatAfterDealer(0)).toBe(1);
    expect(seatAfterDealer(1)).toBe(2);
    expect(seatAfterDealer(2)).toBe(3);
    expect(seatAfterDealer(3)).toBe(0);
  });
});
