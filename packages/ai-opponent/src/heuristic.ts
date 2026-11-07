import {
  Card,
  currentRuleSet,
  currentTrumpSuit,
  GameState,
  legalCardsFor,
  PlayerIndex,
  rankValue,
  RuleSet,
  Suit,
  TrumpSuit,
} from "rules-engine";
import { allowedPlays, GuardrailStats } from "./guardrails";
import { CardTracker, isMasterCard, opponentVoidCount, trackCards } from "./cardTracker";

function lowestCard(cards: Card[], backwards: boolean): Card {
  return cards.reduce((best, c) =>
    rankValue(c.rank, backwards) < rankValue(best.rank, backwards) ? c : best,
  );
}

function highestCard(cards: Card[], backwards: boolean): Card {
  return cards.reduce((best, c) =>
    rankValue(c.rank, backwards) > rankValue(best.rank, backwards) ? c : best,
  );
}

function suitLength(hand: Card[], suit: Suit): number {
  return hand.filter((c) => c.suit === suit).length;
}

function groupBySuit(cards: Card[]): Map<Suit, Card[]> {
  const map = new Map<Suit, Card[]>();
  for (const card of cards) {
    const list = map.get(card.suit);
    if (list) list.push(card);
    else map.set(card.suit, [card]);
  }
  return map;
}

/**
 * Below this trump length, `choosePositiveLead`'s "no master, but lead trump anyway to draw
 * opponents out" branch stays off — holding merely 3-4 of a 13-card suit isn't control, it's just
 * a decent length, and proactively burning a card like a bare King of trump while the Ace is still
 * unseen (neither played nor in hand) is a real risk no table player would take on that thin a
 * holding. At 5+ (well above the ~3.25-per-suit average across 4 hands, meaning the other three
 * players combined hold at most 8), the length itself is close enough to a real trump-control
 * signal that leading is worth it even without a proven master — see .claude/skills/
 * king-ai-opponent and `chooseCard.test.ts`'s regression test for the exact scenario this fixes.
 */
const TRUMP_LEAD_CONTROL_LENGTH = 5;

function bestMaster(cards: Card[], hand: Card[], tracker: CardTracker, ruleSet: RuleSet): Card | null {
  const masters = cards.filter((c) => isMasterCard(c, hand, tracker));
  return masters.length > 0 ? highestCard(masters, ruleSet.backwards) : null;
}

/**
 * Leading a positive-hand trick, aware of what's already been played and shown void (`tracker`) —
 * the "normal" difficulty's specific improvement over always leading the flat-highest card:
 *
 * 1. A "master" card (guaranteed the highest remaining of its suit — see `isMasterCard`) is the
 *    strongest available signal short of a full search; lead the master from the longest such
 *    suit, extending control over that suit as long as possible.
 * 2. Failing that, with near-certain trump control (`TRUMP_LEAD_CONTROL_LENGTH`+) and a trump in
 *    play, lead trump to draw out opponents' trumps while still in control, rather than risking a
 *    side-suit lead into a ruff. A merely decent holding below that bar is held in reserve.
 * 3. Otherwise, lead the highest card from whichever suit is both long in hand and has the fewest
 *    opponents already known void in it (fewer void opponents = lower ruff risk).
 *
 * `legal` arrives already narrowed by `allowedPlays` (guardrails.ts) — an unjustified trump lead
 * or a lead into a known-void-but-still-trumped opponent is already excluded before this function
 * ever sees it; this only decides which of the *remaining* candidates is tactically best.
 */
function choosePositiveLead(
  state: GameState,
  player: PlayerIndex,
  legal: Card[],
  tracker: CardTracker,
  ruleSet: RuleSet,
  trumpSuit: TrumpSuit,
): Card {
  const hand = state.hands[player];
  const bySuit = groupBySuit(legal);

  // A master trump is the strongest possible lead — nothing beats it, and being trump itself it
  // can't be ruffed the way a master in a plain suit can.
  if (trumpSuit !== null) {
    const masterTrump = bestMaster(bySuit.get(trumpSuit) ?? [], hand, tracker, ruleSet);
    if (masterTrump !== null) return masterTrump;
  }

  // A master in a non-trump suit only stays safe to lead if no opponent has already shown void in
  // that suit — a depleted suit (which is exactly what makes a card its "master") also means
  // opponents are more likely to be void in it, and a void opponent can simply ruff instead of
  // following. Restrict to the suits with zero known voids before picking the best master.
  const safeSuits = [...bySuit.entries()].filter(
    ([suit]) => suit !== trumpSuit && opponentVoidCount(tracker, player, suit) === 0,
  );
  let bestSafeMaster: Card | null = null;
  for (const [, cards] of safeSuits) {
    const master = bestMaster(cards, hand, tracker, ruleSet);
    if (master !== null && (bestSafeMaster === null || suitLength(hand, master.suit) > suitLength(hand, bestSafeMaster.suit))) {
      bestSafeMaster = master;
    }
  }
  if (bestSafeMaster !== null) return bestSafeMaster;

  // No guaranteed winner available. Only with genuine trump length — near-certain control, not
  // just a decent holding — lead trump to draw opponents' trumps out while still in control,
  // rather than risking an unproven side-suit lead into a ruff. Below that bar, hold trump back
  // instead of spending it recklessly (see TRUMP_LEAD_CONTROL_LENGTH's doc comment).
  if (trumpSuit !== null && suitLength(hand, trumpSuit) >= TRUMP_LEAD_CONTROL_LENGTH) {
    const trumpCards = bySuit.get(trumpSuit);
    if (trumpCards !== undefined) return highestCard(trumpCards, ruleSet.backwards);
  }

  // Otherwise, the safest available lead: fewest known-void opponents, then longest suit, then —
  // if suits are still tied on both — whichever suit's own best card outranks the others', so
  // this degrades to "just lead the single highest legal card" exactly when length/void give no
  // real signal, rather than an arbitrary pick among equally-long, equally-safe suits. Trump is
  // deliberately excluded here — it's already been considered above (master, or real control
  // length) and rejected, so letting it compete on raw length/void like any other suit would
  // silently reopen the same "burn a decent-but-not-controlling trump holding" bug those branches
  // exist to prevent. Only fall through to trump if it's genuinely the only suit left to lead.
  const nonTrumpSuits = [...bySuit.keys()].filter((suit) => suit !== trumpSuit);
  const candidates = nonTrumpSuits.length > 0 ? nonTrumpSuits : [...bySuit.keys()];
  const suits = candidates.sort((a, b) => {
    const voidDiff = opponentVoidCount(tracker, player, a) - opponentVoidCount(tracker, player, b);
    if (voidDiff !== 0) return voidDiff;
    const lengthDiff = suitLength(hand, b) - suitLength(hand, a);
    if (lengthDiff !== 0) return lengthDiff;
    const aTop = rankValue(highestCard(bySuit.get(a)!, ruleSet.backwards).rank, ruleSet.backwards);
    const bTop = rankValue(highestCard(bySuit.get(b)!, ruleSet.backwards).rank, ruleSet.backwards);
    return bTop - aTop;
  });
  return highestCard(bySuit.get(suits[0])!, ruleSet.backwards);
}

/**
 * Tier 1 heuristic bot — see .claude/skills/king-ai-opponent. Always legal: every branch chooses
 * only from `legalCardsFor`, further narrowed by `allowedPlays` (guardrails.ts) — the shared
 * "Errores bobos" floor every difficulty routes through before its own policy runs. Exported (not
 * just used by chooseCard.ts's "easy"/"normal" branches) because ismcts.ts also reuses it verbatim
 * as its rollout/default policy — the same policy, not a second weaker one written just for
 * rollouts.
 *
 * `allowedPlays` already resolves most decisions down to a single forced or obviously-correct
 * candidate (a negative hand's mid-trick duck/forced-win, No Last Two's free-zone override, a
 * positive hand's cheapest-winner cut) — this function's own branches below only ever have real
 * work left to do when a genuine tactical choice remains: which safe card to lead negatively
 * (lowest), which suit to lead positively (`choosePositiveLead`), or which safe discard to make
 * when ducking a positive-hand trick that's already lost (lowest of what's left).
 *
 * `tracking` toggles the card-tracking-aware positive-hand leading improvements (see
 * `choosePositiveLead`) on or off — "normal" difficulty and ISMCTS rollouts want it on; "easy"
 * wants it off, matching the flat pre-tracking heuristic (though still routed through the same
 * guardrails either way).
 */
export function chooseCardHeuristic(
  state: GameState,
  player: PlayerIndex,
  tracking: boolean,
  stats?: GuardrailStats,
): Card {
  const rawLegal = legalCardsFor(state, player);
  if (rawLegal.length === 1) return rawLegal[0];

  const ruleSet = currentRuleSet(state);
  const trumpSuit = currentTrumpSuit(state);
  const legal = allowedPlays(state, player, rawLegal, ruleSet, trumpSuit, stats);
  if (legal.length === 1) return legal[0];

  const isPositive = state.handType === "positive";

  if (state.currentTrick.length === 0) {
    // Leading: already narrowed to safe candidates by allowedPlays. Negative hands lead the
    // lowest of what's left (there's no trump to weigh, and a global-lowest lead maximizes safety
    // on the trick actually in front of them, so tracking doesn't change this branch); positive
    // hands lead high, tracking-aware when enabled.
    if (!isPositive) return lowestCard(legal, ruleSet.backwards);
    if (!tracking) return highestCard(legal, ruleSet.backwards);
    return choosePositiveLead(state, player, legal, trackCards(state), ruleSet, trumpSuit);
  }

  // Mid-trick: allowedPlays already decided a negative hand's duck/forced-win choice down to a
  // single card (caught by the early return above) and a positive hand's cheapest-winner cut down
  // to a single card too — what's left here is only ever a positive hand ducking a trick it's
  // already lost, with multiple non-master discards still open to choose among. Preserve the
  // strongest of those by discarding the cheapest.
  return lowestCard(legal, ruleSet.backwards);
}
