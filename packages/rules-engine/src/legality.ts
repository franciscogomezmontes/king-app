import { Card, Suit } from "./types";

/**
 * Standard follow-suit legality: must follow the led suit if able; otherwise any card is legal.
 * Does not yet implement the "Mandatory Killing" alternative rule (must beat the highest card /
 * must trump if void) — that's Phase 2 work per the Notion project plan, since it requires
 * knowing the trick-so-far and the trump suit, not just the led suit.
 */
export function legalPlays(hand: Card[], ledSuit: Suit | null): Card[] {
  if (ledSuit === null) return hand.slice();
  const followers = hand.filter((c) => c.suit === ledSuit);
  return followers.length > 0 ? followers : hand.slice();
}

/**
 * The "no hearts may be led unless it's all you have left" restriction that applies to both
 * the No Hearts and No King of Hearts hands.
 */
export function canLeadHearts(hand: Card[]): boolean {
  return hand.every((c) => c.suit === "H");
}
