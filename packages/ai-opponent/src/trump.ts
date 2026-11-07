import { GameState, PlayerIndex, TrumpSuit } from "rules-engine";
import { estimateTricks, longestSuit, suitLengths } from "./handStrength";

/**
 * Below this estimated-tricks threshold, the dealer opens the auction instead of naming trump
 * themselves outright. Opening is a free option when `auctionMustSell` is off — the dealer can
 * always decline every bid and fall back to naming trump exactly as if they'd never opened (see
 * rules-engine's `resolveDealerDecision`) — so the threshold is far more permissive in that case;
 * only a hand strong enough that no realistic bid would beat it skips soliciting offers at all.
 * When `auctionMustSell` is on, opening commits to selling to the highest bid if one comes in, so
 * the threshold stays cautious. Tunable — see .claude/skills/king-ai-opponent.
 */
// Lower than trumpSearch.ts's own equivalent (6) — `estimateTricks` is calibrated so 3 is already
// a strong bid and 4 is rare (see handStrength.ts's own doc comment), a much more compressed scale
// than the simulation-based implied-tricks Tier 2.5 uses, which can legitimately reach 8-9 for a
// genuinely exceptional hand. A shared literal across both tiers would either almost never trigger
// here or trigger far too aggressively there.
const AUCTION_THRESHOLD_NOT_FORCED = 4;
const AUCTION_THRESHOLD_FORCED_SELL = 3;

/** Should the dealer open this positive hand up to auction rather than naming trump directly? */
export function shouldOpenAuction(state: GameState, dealer: PlayerIndex): boolean {
  const threshold = state.ruleSet.auctionMustSell ? AUCTION_THRESHOLD_FORCED_SELL : AUCTION_THRESHOLD_NOT_FORCED;
  return estimateTricks(state.hands[dealer]) < threshold;
}

/** Minimum suit length worth declaring as trump; shorter than this, declare no-trump instead. */
const MIN_TRUMP_SUIT_LENGTH = 4;

export interface TrumpDeclaration {
  trump: TrumpSuit;
  direction: "up" | "down";
  backwards: boolean;
}

/**
 * Picks trump/no-trump for the trump-namer's hand: their longest suit, if long enough to be worth
 * declaring, else no-trump. `direction`/`backwards` are always the Tier 1 defaults ("up"/false) —
 * always legal regardless of whether GameRules gates those on, since declining an available
 * option never violates the gate. Choosing when they're actually favorable needs deeper analysis
 * than Tier 1 heuristics attempt — see .claude/skills/king-ai-opponent.
 */
export function chooseTrumpDeclaration(state: GameState, trumpNamer: PlayerIndex): TrumpDeclaration {
  const hand = state.hands[trumpNamer];
  const best = longestSuit(hand);
  const trump: TrumpSuit = suitLengths(hand)[best] >= MIN_TRUMP_SUIT_LENGTH ? best : null;
  return { trump, direction: "up", backwards: false };
}
