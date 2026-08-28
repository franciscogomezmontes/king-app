import { describe, expect, it } from "vitest";
import { AuctionBid, PlayerIndex } from "rules-engine";
import { advanceAuctionTurn, AuctionTurnState, biddingOrder, currentBidder, INITIAL_AUCTION_TURN } from "../src/game/auctionOrder";

function bid(player: PlayerIndex, tricks: number): AuctionBid {
  return { player, tricks };
}

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

// A real multi-round English auction (Francisco's explicit correction of an earlier "one
// bid-or-pass each, no re-raises" simplification): passing removes a seat from the rest of this
// auction, but bidding keeps them in it — the rotation keeps cycling through whoever's still
// active until only one is left and they've already had a turn.
describe("currentBidder — multi-round auction with pass-elimination", () => {
  const dealer: PlayerIndex = 0; // biddingOrder(0) = [1, 2, 3]

  it("asks the first seat after the dealer when nobody has acted yet", () => {
    expect(currentBidder(dealer, [], INITIAL_AUCTION_TURN)).toBe(1);
  });

  it("cycles through active seats in fixed order as they each bid, coming back around to someone who already bid", () => {
    let turn = INITIAL_AUCTION_TURN;
    const bids: AuctionBid[] = [];

    // Seat 1 bids 1 — still active, asked again once it comes back around.
    expect(currentBidder(dealer, bids, turn)).toBe(1);
    bids.push(bid(1, 1));
    turn = advanceAuctionTurn(turn, 1, false);

    // Seat 2 bids 2.
    expect(currentBidder(dealer, bids, turn)).toBe(2);
    bids.push(bid(2, 2));
    turn = advanceAuctionTurn(turn, 2, false);

    // Seat 3 bids 3.
    expect(currentBidder(dealer, bids, turn)).toBe(3);
    bids.push(bid(3, 3));
    turn = advanceAuctionTurn(turn, 3, false);

    // Back to seat 1 — matches Francisco's own example: "a mi me debería volver a llegar la
    // pregunta sobre las 3 vigentes".
    expect(currentBidder(dealer, bids, turn)).toBe(1);
  });

  it("ends the auction once only one active seat remains and they've already had a turn", () => {
    let turn = INITIAL_AUCTION_TURN;
    const bids: AuctionBid[] = [bid(1, 1), bid(2, 2), bid(3, 3)];
    turn = advanceAuctionTurn(turn, 1, false);
    turn = advanceAuctionTurn(turn, 2, false);
    turn = advanceAuctionTurn(turn, 3, false);
    // Back to seat 1 (the cycle above) — they pass instead of raising past 3.
    turn = advanceAuctionTurn(turn, 1, true);
    // Seat 2 also passes.
    turn = advanceAuctionTurn(turn, 2, true);

    // Only seat 3 remains active, and they already bid — auction is over, seat 3 wins with 3.
    expect(currentBidder(dealer, bids, turn)).toBeNull();
  });

  it("still asks the sole remaining active seat their first question, if the others passed before it ever reached them", () => {
    let turn = INITIAL_AUCTION_TURN;
    turn = advanceAuctionTurn(turn, 1, true); // seat 1 passes immediately, never bids
    turn = advanceAuctionTurn(turn, 2, true); // seat 2 passes immediately, never bids
    // Seat 3 hasn't been asked yet — still needs their turn, even though they're the only one left.
    expect(currentBidder(dealer, [], turn)).toBe(3);
  });

  it("ends with no bidder at all once every seat has passed without ever bidding", () => {
    let turn = INITIAL_AUCTION_TURN;
    turn = advanceAuctionTurn(turn, 1, true);
    turn = advanceAuctionTurn(turn, 2, true);
    turn = advanceAuctionTurn(turn, 3, true);
    expect(currentBidder(dealer, [], turn)).toBeNull();
  });

  it("a seat that bid earlier can still pass later, dropping out even though their own bid stands", () => {
    let turn = INITIAL_AUCTION_TURN;
    const bids: AuctionBid[] = [bid(1, 2)];
    turn = advanceAuctionTurn(turn, 1, false);
    expect(currentBidder(dealer, bids, turn)).toBe(2);
    // Seat 2 passes without ever bidding.
    turn = advanceAuctionTurn(turn, 2, true);
    expect(currentBidder(dealer, bids, turn)).toBe(3);
    // Seat 3 also passes without bidding — only seat 1 remains, and they already bid 2.
    turn = advanceAuctionTurn(turn, 3, true);
    expect(currentBidder(dealer, bids, turn)).toBeNull();
  });
});
