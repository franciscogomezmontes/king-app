import { describe, expect, it } from "vitest";
import { PlayerIndex } from "rules-engine";
import { biddingOrder, currentBidder } from "../src/game/auctionOrder";

describe("biddingOrder", () => {
  it("lists the 3 non-dealer seats, starting after the dealer", () => {
    expect(biddingOrder(0)).toEqual([1, 2, 3]);
    expect(biddingOrder(2)).toEqual([3, 0, 1]);
    expect(biddingOrder(3)).toEqual([0, 1, 2]);
  });

  it("never includes the dealer", () => {
    for (const dealer of [0, 1, 2, 3] as PlayerIndex[]) {
      expect(biddingOrder(dealer)).not.toContain(dealer);
    }
  });
});

describe("currentBidder", () => {
  it("steps through the bidding order as biddingIndex advances", () => {
    expect(currentBidder(0, 0)).toBe(1);
    expect(currentBidder(0, 1)).toBe(2);
    expect(currentBidder(0, 2)).toBe(3);
  });

  it("returns null once all 3 non-dealer seats have had a turn", () => {
    expect(currentBidder(0, 3)).toBeNull();
  });
});
