import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { AuctionBid, AuctionResult, highestBid, resolveAuction } from "../src/auction";
import { applyAuctionTransfer } from "../src/scoring";
import { DEFAULT_RULE_SET, PlayerIndex, RuleSet } from "../src/types";

function sum(record: Record<PlayerIndex, number>): number {
  return record[0] + record[1] + record[2] + record[3];
}

describe("highestBid", () => {
  it("returns null for no bids", () => {
    expect(highestBid([])).toBeNull();
  });

  it("picks the largest bid", () => {
    const bids: AuctionBid[] = [
      { player: 1, tricks: 5 },
      { player: 2, tricks: 8 },
      { player: 3, tricks: 6 },
    ];
    expect(highestBid(bids)).toEqual({ player: 2, tricks: 8 });
  });

  it("ties go to whichever bid came first", () => {
    const bids: AuctionBid[] = [
      { player: 1, tricks: 7 },
      { player: 2, tricks: 7 },
    ];
    expect(highestBid(bids)).toEqual({ player: 1, tricks: 7 });
  });
});

describe("resolveAuction", () => {
  const dealer: PlayerIndex = 0;

  it("returns null when nobody bids", () => {
    expect(resolveAuction([], dealer, true, DEFAULT_RULE_SET)).toBeNull();
  });

  it("ignores a bid from the dealer — only the other three players may bid", () => {
    const bids: AuctionBid[] = [{ player: dealer, tricks: 9 }];
    expect(resolveAuction(bids, dealer, true, DEFAULT_RULE_SET)).toBeNull();
  });

  it("returns null if the dealer declines the highest bid (auctionMustSell off)", () => {
    const bids: AuctionBid[] = [{ player: 1, tricks: 7 }];
    expect(resolveAuction(bids, dealer, false, DEFAULT_RULE_SET)).toBeNull();
  });

  it("forces acceptance when auctionMustSell is on, even if the dealer would otherwise decline", () => {
    const bids: AuctionBid[] = [{ player: 1, tricks: 7 }];
    const ruleSet: RuleSet = { ...DEFAULT_RULE_SET, auctionMustSell: true };
    expect(resolveAuction(bids, dealer, false, ruleSet)).toEqual({ dealer, winner: 1, bid: 7 });
  });

  it("returns the winning bid when the dealer accepts", () => {
    const bids: AuctionBid[] = [
      { player: 1, tricks: 5 },
      { player: 2, tricks: 8 },
      { player: 3, tricks: 6 },
    ];
    expect(resolveAuction(bids, dealer, true, DEFAULT_RULE_SET)).toEqual({
      dealer,
      winner: 2,
      bid: 8,
    });
  });

  it("a dealer bid never wins even if it's numerically highest", () => {
    const bids: AuctionBid[] = [
      { player: dealer, tricks: 12 },
      { player: 1, tricks: 5 },
    ];
    expect(resolveAuction(bids, dealer, true, DEFAULT_RULE_SET)).toEqual({
      dealer,
      winner: 1,
      bid: 5,
    });
  });
});

describe("applyAuctionTransfer", () => {
  it("returns tricksWon unchanged when there's no auction", () => {
    const tricksWon: Record<PlayerIndex, number> = { 0: 3, 1: 4, 2: 3, 3: 3 };
    expect(applyAuctionTransfer(tricksWon, null)).toEqual(tricksWon);
  });

  it("moves the bid amount — not the winner's actual captured tricks — from winner to dealer", () => {
    // Winner captured 9 tricks but only bid 4: dealer gets the bid (4), winner keeps the surplus (5).
    const tricksWon: Record<PlayerIndex, number> = { 0: 2, 1: 9, 2: 1, 3: 1 };
    const auction: AuctionResult = { dealer: 0, winner: 1, bid: 4 };
    expect(applyAuctionTransfer(tricksWon, auction)).toEqual({ 0: 6, 1: 5, 2: 1, 3: 1 });
  });

  it("still moves the full bid even if the winner fails to capture that many tricks", () => {
    // Winner bid 8 but only captured 3: dealer still receives the full bid of 8, winner goes negative.
    const tricksWon: Record<PlayerIndex, number> = { 0: 5, 1: 3, 2: 3, 3: 2 };
    const auction: AuctionResult = { dealer: 0, winner: 1, bid: 8 };
    expect(applyAuctionTransfer(tricksWon, auction)).toEqual({ 0: 13, 1: -5, 2: 3, 3: 2 });
  });

  it("never changes the total trick count across all 4 players, for any dealer/winner/bid combination", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 13 }),
        fc.integer({ min: 0, max: 13 }),
        fc.integer({ min: 0, max: 13 }),
        fc.integer({ min: 0, max: 13 }),
        fc.integer({ min: 0, max: 3 }),
        fc.integer({ min: 1, max: 3 }),
        fc.integer({ min: -20, max: 20 }),
        (t0, t1, t2, t3, dealer, offset, bid) => {
          const tricksWon: Record<PlayerIndex, number> = { 0: t0, 1: t1, 2: t2, 3: t3 };
          const total = sum(tricksWon);
          const winner = ((dealer + offset) % 4) as PlayerIndex;
          const auction: AuctionResult = { dealer: dealer as PlayerIndex, winner, bid };
          const after = applyAuctionTransfer(tricksWon, auction);
          expect(sum(after)).toBe(total);
        },
      ),
      { numRuns: 200 },
    );
  });
});
