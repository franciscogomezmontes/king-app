import { PlayerIndex } from "rules-engine";

/**
 * Fixed bidding-turn policy — a small, deliberate port of `apps/mobile/src/game/auctionOrder.ts`
 * (apps/server can't import from apps/mobile). rules-engine's own auction.ts leaves the turn
 * structure open (only "bids must strictly increase" is an engine rule); Solo mode's UI already
 * picked this policy (each of the 3 non-dealer seats gets exactly one bid-or-pass, in seat order
 * starting after the dealer, then the dealer decides — no re-raise rounds), and online reuses the
 * same policy so play feels identical between modes. Unlike Solo, the server is the one place this
 * actually has to be *enforced*, not just displayed — see KingRoom's bid-turn check.
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
