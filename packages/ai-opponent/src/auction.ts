import { GameState, highestBid, PlayerIndex } from "rules-engine";
import { estimateTricks } from "./handStrength";

/** Same reasoning/value as `trumpSearch.ts`'s own `BID_MARGIN` — a winning bid nets the bidder
 * `(actual_tricks - bid) * 25` at scoring time, so bidding the raw estimate is an ~0-EV move by
 * construction; a margin of headroom leaves real expected upside. Independently declared here
 * since Tier 1 and Tier 2.5 use different estimators. */
const BID_MARGIN = 2;

/**
 * Should `bidder` raise the auction, and to what? Bids `BID_MARGIN` tricks below the hand's
 * estimated trick count if that still exceeds the current high bid, else declines (`null`) — no
 * incremental bidding war, one estimate, one shot, per .claude/skills/king-ai-opponent's "keep it
 * simple and tunable" guidance.
 */
export function chooseBid(state: GameState, bidder: PlayerIndex): number | null {
  const estimate = Math.max(0, estimateTricks(state.hands[bidder]) - BID_MARGIN);
  const currentHigh = highestBid(state.positiveSetup?.bids ?? [])?.tricks ?? 0;
  return estimate > currentHigh ? estimate : null;
}

/**
 * Should the dealer accept the auction's winning bid? Sells when the bid promises more tricks
 * than the dealer expects to make on their own.
 */
export function chooseDealerDecision(state: GameState, dealer: PlayerIndex): boolean {
  const top = highestBid(state.positiveSetup?.bids ?? []);
  if (top === null) return false;
  return top.tricks > estimateTricks(state.hands[dealer]);
}
