import { AuctionBid, PlayerIndex } from "rules-engine";

/**
 * Fixed bidding-turn policy — a small, deliberate port of `apps/mobile/src/game/auctionOrder.ts`
 * (apps/server can't import from apps/mobile). rules-engine's own auction.ts leaves the turn
 * structure open (only "bids must strictly increase" is an engine rule); Solo mode's UI already
 * picked this policy, and online reuses the same policy so play feels identical between modes.
 * Unlike Solo, the server is the one place this actually has to be *enforced*, not just displayed
 * — see KingRoom's bid-turn check. Keep this file in sync with the mobile copy by hand.
 */
export function biddingOrder(dealer: PlayerIndex): PlayerIndex[] {
  const order: PlayerIndex[] = [];
  for (let offset = 1; offset <= 3; offset++) {
    order.push(((dealer + offset) % 4) as PlayerIndex);
  }
  return order;
}

/** Turn-tracking state for one live auction — reset whenever a fresh auction opens or the hand
 * changes. See the mobile copy of this file for the full design rationale. */
export interface AuctionTurnState {
  passedSeats: PlayerIndex[];
  lastAsked: PlayerIndex | null;
}

export const INITIAL_AUCTION_TURN: AuctionTurnState = { passedSeats: [], lastAsked: null };

/**
 * Whose turn it is to bid-or-pass right now, or `null` once the auction is decided — meaning it's
 * the dealer's turn to accept/decline. A real multi-round English auction: passing removes a seat
 * from the rest of this auction for good, but bidding keeps them in it — if the rotation comes
 * back around to them, they're asked again whether they want to top the new current high bid. Ends
 * the moment only one non-dealer seat is still active (hasn't passed) *and* that seat has already
 * had at least one turn — `submitBid`'s own strictly-increasing invariant guarantees that seat's
 * bid is the highest one on record, so `resolveAuction`/`highestBid` need no changes to keep
 * picking the right winner.
 */
export function currentBidder(dealer: PlayerIndex, bids: AuctionBid[], turn: AuctionTurnState): PlayerIndex | null {
  const order = biddingOrder(dealer);
  const active = order.filter((seat) => !turn.passedSeats.includes(seat));
  if (active.length === 0) return null;
  if (active.length === 1) {
    const soleSeat = active[0];
    return bids.some((b) => b.player === soleSeat) ? null : soleSeat;
  }
  const startIndex = turn.lastAsked === null ? 0 : (order.indexOf(turn.lastAsked) + 1) % order.length;
  for (let i = 0; i < order.length; i++) {
    const seat = order[(startIndex + i) % order.length];
    if (!turn.passedSeats.includes(seat)) return seat;
  }
  return null;
}

/** Advances turn state after `seat` is asked and either bids or passes. */
export function advanceAuctionTurn(turn: AuctionTurnState, seat: PlayerIndex, passed: boolean): AuctionTurnState {
  return {
    passedSeats: passed ? [...turn.passedSeats, seat] : turn.passedSeats,
    lastAsked: seat,
  };
}
