import { rankValue } from "./rank";
import { Card, DEFAULT_RULE_SET, RuleSet, Suit, TrumpSuit } from "./types";

/**
 * Would playing `candidate` (a led-suit card, from a hand that isn't void in it) currently win
 * this trick if it were added as the next play? Mirrors trick.ts's `resolveTrick` precedence
 * exactly (trump beats non-trump outright; otherwise the highest card of the led suit) so a card
 * "Mandatory Killing" forces as a beat and a card that would actually win the trick never
 * disagree — see this function's own regression test for the scenario that caught the bug this
 * fixes: comparing candidates by raw rank within the led suit alone (ignoring that a trump may
 * already have been thrown by an earlier player) could force a *higher* led-suit card into a
 * trick a trump had already made unwinnable, when any legal follower would do.
 */
function wouldBeat(
  candidate: Card,
  cardsPlayedThisTrick: Card[],
  ledSuit: Suit,
  trumpSuit: TrumpSuit,
  backwards: boolean,
): boolean {
  const hypothetical = [...cardsPlayedThisTrick, candidate];
  const trumpCards = trumpSuit !== null ? hypothetical.filter((c) => c.suit === trumpSuit) : [];
  const contenders = trumpCards.length > 0 ? trumpCards : hypothetical.filter((c) => c.suit === ledSuit);
  const winner = contenders.reduce((best, c) =>
    rankValue(c.rank, backwards) > rankValue(best.rank, backwards) ? c : best,
  );
  return winner.suit === candidate.suit && winner.rank === candidate.rank;
}

/**
 * Legal plays for a hand, given the cards already played this trick (in play order; empty if
 * this player is leading) and the hand's trump suit (`null` for a no-trump hand).
 *
 * Base rule (ruleSet.mandatoryKilling off): must follow the led suit if able; otherwise any
 * card is legal.
 *
 * "Mandatory Killing" (ruleSet.mandatoryKilling on), per CLAUDE.md: must beat the highest card
 * of the led suit if able; else must trump if able; free play only if void in both. "Beat" is
 * judged against the trick's actual current winner (see `wouldBeat`) — once someone has already
 * trumped the trick, no led-suit follower can beat that regardless of rank, so the obligation
 * degrades to plain follow-suit (any led-suit card is legal) rather than forcing out a needlessly
 * high one that still loses.
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
    const beaters = followers.filter((c) =>
      wouldBeat(c, cardsPlayedThisTrick, ledSuit, trumpSuit, ruleSet.backwards),
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
