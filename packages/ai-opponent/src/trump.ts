import { GameState, PlayerIndex, TrumpSuit } from "rules-engine";
import { estimateTricks, longestSuit, suitLengths } from "./handStrength";

/**
 * Below this estimated-tricks threshold, the dealer sells trump-naming rights via auction instead
 * of naming trump themselves. Tunable — see .claude/skills/king-ai-opponent.
 */
const AUCTION_THRESHOLD = 3;

/** Should the dealer open this positive hand up to auction rather than naming trump directly? */
export function shouldOpenAuction(state: GameState, dealer: PlayerIndex): boolean {
  return estimateTricks(state.hands[dealer]) < AUCTION_THRESHOLD;
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
