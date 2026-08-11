import { PlayerIndex, RuleSet } from "./types";

/**
 * One player's bid during a positive-hand auction: the number of tricks they claim they can
 * take if given the right to name trump. Per CLAUDE.md, only the three non-dealer players bid
 * — the dealer is who they're bidding against.
 */
export interface AuctionBid {
  player: PlayerIndex;
  tricks: number;
}

/**
 * A resolved auction: `winner` gets to name trump. At scoring time, `bid` tricks transfer from
 * `winner`'s trick tally to `dealer`'s — see `applyAuctionTransfer` in scoring.ts. Note this is
 * the winning *bid* amount, not however many tricks `winner` actually ends up capturing.
 */
export interface AuctionResult {
  dealer: PlayerIndex;
  winner: PlayerIndex;
  bid: number;
}

/**
 * The standing highest bid, or null if no bids were made. Ties go to whichever bid came first
 * in `bids` — during a live auction a new bid only replaces the standing one by strictly
 * exceeding it, so equal bids can't both reach this function as genuine competing offers.
 */
export function highestBid(bids: AuctionBid[]): AuctionBid | null {
  if (bids.length === 0) return null;
  return bids.reduce((best, b) => (b.tricks > best.tricks ? b : best));
}

/**
 * Resolves a positive-hand auction. Bids from the dealer are ignored — only the other three
 * players may bid for trump-naming rights.
 *
 * - No (eligible) bids: the dealer keeps trump-naming rights outright; returns null (no score
 *   transfer).
 * - Otherwise the dealer chooses whether to accept the highest bid via `dealerSells`, unless
 *   `ruleSet.auctionMustSell` is on, which removes that choice and forces acceptance.
 * - Dealer declines (and isn't forced to sell): returns null, same as no bids.
 * - Dealer accepts: returns the winning bid as an `AuctionResult` for `applyAuctionTransfer`.
 */
export function resolveAuction(
  bids: AuctionBid[],
  dealer: PlayerIndex,
  dealerSells: boolean,
  ruleSet: RuleSet,
): AuctionResult | null {
  const eligibleBids = bids.filter((b) => b.player !== dealer);
  const top = highestBid(eligibleBids);
  if (top === null) return null;

  const sells = ruleSet.auctionMustSell || dealerSells;
  if (!sells) return null;

  return { dealer, winner: top.player, bid: top.tricks };
}
