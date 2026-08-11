import { PlayerIndex } from "rules-engine";

/**
 * Fixed bidding-turn policy for this UI. rules-engine's own auction.ts deliberately leaves the
 * turn structure open (only "bids must strictly increase" is an engine rule) — this is a UI-layer
 * policy choice, not a rules-engine rule: each of the 3 non-dealer seats gets exactly one
 * bid-or-pass, in seat order starting after the dealer, then the dealer decides. No re-raise
 * rounds; simple and deterministic for a single-human-seat game.
 */
export function biddingOrder(dealer: PlayerIndex): PlayerIndex[] {
  const order: PlayerIndex[] = [];
  for (let offset = 1; offset <= 3; offset++) {
    order.push(((dealer + offset) % 4) as PlayerIndex);
  }
  return order;
}

/**
 * Whose turn it is to bid-or-pass, given how many of the 3 non-dealer seats have already had
 * theirs (`biddingIndex`, 0-3) — or `null` once all three have, meaning it's the dealer's turn to
 * decide.
 */
export function currentBidder(dealer: PlayerIndex, biddingIndex: number): PlayerIndex | null {
  const order = biddingOrder(dealer);
  return biddingIndex < order.length ? order[biddingIndex] : null;
}
