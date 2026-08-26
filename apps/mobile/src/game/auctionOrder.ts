import { AuctionBid, PlayerIndex } from "rules-engine";

/**
 * Fixed bidding-turn policy for this UI. rules-engine's own auction.ts deliberately leaves the
 * turn structure open (only "bids must strictly increase" is an engine rule) — this is a UI-layer
 * policy choice, not a rules-engine rule.
 */
export function biddingOrder(dealer: PlayerIndex): PlayerIndex[] {
  const order: PlayerIndex[] = [];
  for (let offset = 1; offset <= 3; offset++) {
    order.push(((dealer + offset) % 4) as PlayerIndex);
  }
  return order;
}

/**
 * Turn-tracking state for one live auction — reset to `INITIAL_AUCTION_TURN` whenever a fresh
 * auction opens (`OPEN_AUCTION`) or the hand changes. Plain JSON data, same as the old bare
 * `biddingIndex` counter it replaces, so it fits the same persistence/broadcast plumbing.
 */
export interface AuctionTurnState {
  /** Seats that have explicitly passed this auction — out of it for good, even though rules-
   * engine's own `bids` list still remembers any bid they placed before passing. */
  passedSeats: PlayerIndex[];
  /** The seat most recently asked (whether they bid or passed) — where the rotation resumes from
   * next. `null` before anyone's had a turn yet this auction. */
  lastAsked: PlayerIndex | null;
}

export const INITIAL_AUCTION_TURN: AuctionTurnState = { passedSeats: [], lastAsked: null };

/**
 * Whose turn it is to bid-or-pass right now, or `null` once the auction is decided — meaning it's
 * the dealer's turn to accept/decline. A real multi-round English auction (per Francisco's
 * explicit correction of an earlier "one bid-or-pass each, no re-raises" simplification): passing
 * removes a seat from the rest of this auction for good, but bidding keeps them in it — if the
 * rotation comes back around to them, they're asked again whether they want to top the new current
 * high bid. Ends the moment only one non-dealer seat is still active (hasn't passed) *and* that
 * seat has already had at least one turn — the earlier bids' own strictly-increasing invariant
 * (rules-engine's `submitBid` rejects anything that doesn't beat the current high) guarantees that
 * seat's own bid is the highest one on record, so `resolveAuction`/`highestBid` need no changes at
 * all to keep picking the right winner.
 */
export function currentBidder(dealer: PlayerIndex, bids: AuctionBid[], turn: AuctionTurnState): PlayerIndex | null {
  const order = biddingOrder(dealer);
  const active = order.filter((seat) => !turn.passedSeats.includes(seat));
  if (active.length === 0) return null; // everyone passed — no bids at all, or every bidder later dropped out
  if (active.length === 1) {
    const soleSeat = active[0];
    // Already bid at least once (and everyone else has since passed) — nothing left to ask them.
    // Hasn't had a turn yet (everyone else passed before ever reaching them) — still needs one.
    return bids.some((b) => b.player === soleSeat) ? null : soleSeat;
  }
  const startIndex = turn.lastAsked === null ? 0 : (order.indexOf(turn.lastAsked) + 1) % order.length;
  for (let i = 0; i < order.length; i++) {
    const seat = order[(startIndex + i) % order.length];
    if (!turn.passedSeats.includes(seat)) return seat;
  }
  return null; // unreachable — active.length >= 2 guarantees a hit within one lap
}

/** Advances turn state after `seat` is asked and either bids (rules-engine's own `bids` list
 * already records the bid itself — nothing to add here) or passes. */
export function advanceAuctionTurn(turn: AuctionTurnState, seat: PlayerIndex, passed: boolean): AuctionTurnState {
  return {
    passedSeats: passed ? [...turn.passedSeats, seat] : turn.passedSeats,
    lastAsked: seat,
  };
}
