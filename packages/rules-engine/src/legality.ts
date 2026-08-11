import { rankValue } from "./rank";
import { Card, DEFAULT_RULE_SET, RuleSet, Suit, TrumpSuit } from "./types";

/** The highest-value card of `suit` among `cards`, or null if none present. */
function bestOfSuit(cards: Card[], suit: Suit, backwards: boolean): Card | null {
  const inSuit = cards.filter((c) => c.suit === suit);
  if (inSuit.length === 0) return null;
  return inSuit.reduce((best, c) =>
    rankValue(c.rank, backwards) > rankValue(best.rank, backwards) ? c : best,
  );
}

/**
 * Legal plays for a hand, given the cards already played this trick (in play order; empty if
 * this player is leading) and the hand's trump suit (`null` for a no-trump hand).
 *
 * Base rule (ruleSet.mandatoryKilling off): must follow the led suit if able; otherwise any
 * card is legal.
 *
 * "Mandatory Killing" (ruleSet.mandatoryKilling on), per CLAUDE.md: must beat the highest card
 * of the led suit if able; else must trump if able; free play only if void in both. "Beat" here
 * is judged only against the led suit's own cards in the trick — not against a trump another
 * player may have already thrown in — matching the rule as documented.
 */
export function legalPlays(
  hand: Card[],
  cardsPlayedThisTrick: Card[],
  trumpSuit: TrumpSuit = null,
  ruleSet: RuleSet = DEFAULT_RULE_SET,
): Card[] {
  const ledSuit = cardsPlayedThisTrick.length > 0 ? cardsPlayedThisTrick[0].suit : null;
  if (ledSuit === null) return hand.slice();

  const followers = hand.filter((c) => c.suit === ledSuit);

  if (!ruleSet.mandatoryKilling) {
    return followers.length > 0 ? followers : hand.slice();
  }

  if (followers.length > 0) {
    const currentBest = bestOfSuit(cardsPlayedThisTrick, ledSuit, ruleSet.backwards)!;
    const beaters = followers.filter(
      (c) => rankValue(c.rank, ruleSet.backwards) > rankValue(currentBest.rank, ruleSet.backwards),
    );
    return beaters.length > 0 ? beaters : followers;
  }

  // Void in the led suit: must trump if able.
  if (trumpSuit !== null) {
    const trumps = hand.filter((c) => c.suit === trumpSuit);
    if (trumps.length > 0) return trumps;
  }

  // Void in both the led suit and trump: free play.
  return hand.slice();
}

/**
 * The "no hearts may be led unless it's all you have left" restriction that applies to both
 * the No Hearts and No King of Hearts hands.
 */
export function canLeadHearts(hand: Card[]): boolean {
  return hand.every((c) => c.suit === "H");
}
