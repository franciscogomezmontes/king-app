import { GameState, highestBid, PlayerIndex } from "rules-engine";
import { estimateTricks } from "./handStrength";

/**
 * Should `bidder` raise the auction, and to what? Bids the hand's estimated trick count if it
 * exceeds the current high bid, else declines (`null`) — no incremental bidding war, one
 * estimate, one shot, per .claude/skills/king-ai-opponent's "keep it simple and tunable" guidance.
 */
export function chooseBid(state: GameState, bidder: PlayerIndex): number | null {
  const estimate = estimateTricks(state.hands[bidder]);
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
