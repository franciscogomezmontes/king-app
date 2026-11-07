import { GameState, highestBid, PlayerIndex } from "rules-engine";
import { guardedBid, guardedDealerSell } from "./guardrails";
import { estimateTricks } from "./handStrength";

/** Same reasoning/value as `trumpSearch.ts`'s own `BID_MARGIN` — a winning bid nets the bidder
 * `(actual_tricks - bid) * 25` at scoring time, so bidding the raw estimate is an ~0-EV move by
 * construction; a margin of headroom leaves real expected upside. Independently declared here
 * since Tier 1 and Tier 2.5 use different estimators. Superseded as a hard floor by `guardedBid`
 * (guardrails.ts, "Errores bobos" rows 20/21) whenever it would allow a bid that doesn't leave
 * real margin or that reaches 5+ tricks outside a genuinely exceptional hand — this margin just
 * sets the *starting* ask; `guardedBid` is what every difficulty, including this one, must never
 * actually cross. */
const BID_MARGIN = 2;

/**
 * Should `bidder` raise the auction, and to what? Bids `BID_MARGIN` tricks below the hand's
 * estimated trick count if that still exceeds the current high bid, else declines (`null`) — no
 * incremental bidding war, one estimate, one shot, per .claude/skills/king-ai-opponent's "keep it
 * simple and tunable" guidance. Passed through `guardedBid` so this never violates the shared
 * auction guardrails either, even though by construction it already stays below the raw estimate.
 */
export function chooseBid(state: GameState, bidder: PlayerIndex): number | null {
  const rawEstimate = estimateTricks(state.hands[bidder]);
  const proposed = Math.max(0, rawEstimate - BID_MARGIN);
  const currentHigh = highestBid(state.positiveSetup?.bids ?? [])?.tricks ?? 0;
  return guardedBid(proposed > currentHigh ? proposed : null, rawEstimate);
}

/**
 * Should the dealer accept the auction's winning bid? Sells when the bid promises more tricks
 * than the dealer expects to make on their own — "Errores bobos" row 22's own floor, formalized
 * in `guardedDealerSell` (guardrails.ts) so every difficulty agrees on it.
 */
export function chooseDealerDecision(state: GameState, dealer: PlayerIndex): boolean {
  const top = highestBid(state.positiveSetup?.bids ?? []);
  return guardedDealerSell(top?.tricks ?? null, estimateTricks(state.hands[dealer]));
}
