import { Card, Suit, SUITS } from "rules-engine";

/**
 * Crude Tier-1 estimate of how many tricks this hand is likely to capture, from high-card points
 * (Ace=4, King=3, Queen=2, Jack=1, else 0) divided by 3, rounded. Deliberately simple and tunable
 * rather than a precise model — see .claude/skills/king-ai-opponent. Shared by trump-selection
 * (is this hand strong enough to name trump myself?) and auction bidding/dealer-decision.
 */
export function estimateTricks(hand: Card[]): number {
  const points = hand.reduce((sum, c) => sum + Math.max(0, c.rank - 10), 0);
  return Math.round(points / 3);
}

/** Card count per suit — used to pick a trump suit (the longest one the hand holds). */
export function suitLengths(hand: Card[]): Record<Suit, number> {
  const lengths: Record<Suit, number> = { S: 0, H: 0, D: 0, C: 0 };
  for (const card of hand) lengths[card.suit] += 1;
  return lengths;
}

/** The suit this hand holds the most cards of. Ties break toward the first suit in SUITS order. */
export function longestSuit(hand: Card[]): Suit {
  const lengths = suitLengths(hand);
  return SUITS.reduce((best, suit) => (lengths[suit] > lengths[best] ? suit : best));
}
