import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { AuctionBid, AuctionResult, highestBid, resolveAuction } from "../src/auction";
import { applyAuctionSettlement, AUCTION_BID_POINTS_PER_TRICK } from "../src/scoring";
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

describe("applyAuctionSettlement", () => {
  it("returns scores unchanged when there's no auction", () => {
    const scores: Record<PlayerIndex, number> = { 0: 75, 1: 100, 2: 75, 3: 75 };
    expect(applyAuctionSettlement(scores, null)).toEqual(scores);
  });

  it('direction="up": winner pays dealer bid * 25 points, independent of tricks actually captured', () => {
    const scores: Record<PlayerIndex, number> = { 0: 50, 1: 225, 2: 25, 3: 25 };
    const auction: AuctionResult = { dealer: 0, winner: 1, bid: 4 };
    expect(applyAuctionSettlement(scores, auction, "up")).toEqual({ 0: 150, 1: 125, 2: 25, 3: 25 });
  });

  it('direction="down": winner pays dealer bid * 75 points — more expensive than "up" for the same bid', () => {
    const scores: Record<PlayerIndex, number> = { 0: 100, 1: 25, 2: 75, 3: 125 };
    const auction: AuctionResult = { dealer: 0, winner: 1, bid: 4 };
    expect(applyAuctionSettlement(scores, auction, "down")).toEqual({ 0: 400, 1: -275, 2: 75, 3: 125 });
  });

  it("still charges the full bid even if the winner's own tricks score poorly (bid can exceed what they captured)", () => {
    const scores: Record<PlayerIndex, number> = { 0: 125, 1: 75, 2: 75, 3: 50 };
    const auction: AuctionResult = { dealer: 0, winner: 1, bid: 8 };
    expect(applyAuctionSettlement(scores, auction, "up")).toEqual({ 0: 325, 1: -125, 2: 75, 3: 50 });
  });

  it("never changes the total points across all 4 players, for any dealer/winner/bid/direction combination", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -500, max: 500 }),
        fc.integer({ min: -500, max: 500 }),
        fc.integer({ min: -500, max: 500 }),
        fc.integer({ min: -500, max: 500 }),
        fc.integer({ min: 0, max: 3 }),
        fc.integer({ min: 1, max: 3 }),
        fc.integer({ min: -20, max: 20 }),
        fc.constantFrom("up", "down"),
        (s0, s1, s2, s3, dealer, offset, bid, direction) => {
          const scores: Record<PlayerIndex, number> = { 0: s0, 1: s1, 2: s2, 3: s3 };
          const total = sum(scores);
          const winner = ((dealer + offset) % 4) as PlayerIndex;
          const auction: AuctionResult = { dealer: dealer as PlayerIndex, winner, bid };
          const after = applyAuctionSettlement(scores, auction, direction as "up" | "down");
          expect(sum(after)).toBe(total);
        },
      ),
      { numRuns: 200 },
    );
  });

  it("AUCTION_BID_POINTS_PER_TRICK: down charges 3x up, per the 2026-11-07 decision", () => {
    expect(AUCTION_BID_POINTS_PER_TRICK.down).toBe(AUCTION_BID_POINTS_PER_TRICK.up * 3);
  });
});
