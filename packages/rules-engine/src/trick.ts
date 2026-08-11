import { rankValue } from "./rank";
import { DEFAULT_RULE_SET, PlayerIndex, RuleSet, Trick, TrumpSuit } from "./types";

/**
 * Determines who wins a completed trick: whoever played the highest card of the led suit, unless
 * someone played a trump, in which case the highest trump card wins outright regardless of what
 * was led. Negative hands and no-trump positive hands have no trump suit — pass `trumpSuit =
 * null` for those, which makes the trump branch never trigger (falls straight through to
 * "highest of the led suit"). Honors the "Backwards" alt-rule (2 high, Ace low) via the same
 * `rankValue` legality.ts uses for its mandatory-killing "beat" checks, so what mandatory killing
 * treats as a legal beat and what actually wins the trick always agree.
 */
export function resolveTrick(
  plays: Trick["plays"],
  trumpSuit: TrumpSuit,
  ruleSet: RuleSet = DEFAULT_RULE_SET,
): PlayerIndex {
  if (plays.length === 0) {
    throw new Error("resolveTrick requires at least one play");
  }

  const ledSuit = plays[0].card.suit;
  const trumpPlays = trumpSuit !== null ? plays.filter((p) => p.card.suit === trumpSuit) : [];
  const contenders = trumpPlays.length > 0 ? trumpPlays : plays.filter((p) => p.card.suit === ledSuit);

  return contenders.reduce((best, p) =>
    rankValue(p.card.rank, ruleSet.backwards) > rankValue(best.card.rank, ruleSet.backwards) ? p : best,
  ).player;
}
