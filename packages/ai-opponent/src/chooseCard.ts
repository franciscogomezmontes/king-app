import {
  Card,
  currentRuleSet,
  currentTrumpSuit,
  GameState,
  legalCardsFor,
  NegativeHandType,
  PlayerIndex,
  RandomSource,
  rankValue,
  resolveTrick,
  RuleSet,
  Suit,
  TrumpSuit,
} from "rules-engine";
import { CardTracker, isMasterCard, opponentVoidCount, trackCards } from "./cardTracker";

/** "easy" is today's heuristic with some randomness mixed in (per .claude/skills/king-ai-opponent:
 * "Easy can even just be the Tier 1 heuristic bot with intentional randomness mixed in"). "normal"
 * adds card-tracking awareness (see cardTracker.ts) to leading decisions in positive hands — the
 * gap flagged against the plain heuristic: leads always went highest/lowest with no regard for
 * suit length, trump holdings, or what's already been played/shown void. Tier 2 (ISMCTS,
 * search-based, a difficulty in its own right) is a separate, later piece of work. */
export type Difficulty = "easy" | "normal";

/** Would playing `card` right now win the trick? Exact when `player` is last to act; a sound
 * heuristic signal otherwise. Reuses `resolveTrick` itself rather than reimplementing rank/trump
 * comparisons — the bot must never hand-roll legality or trick resolution. */
function wouldCurrentlyWin(
  state: GameState,
  player: PlayerIndex,
  card: Card,
  trumpSuit: TrumpSuit,
  ruleSet: RuleSet,
): boolean {
  const hypothetical = [...state.currentTrick, { player, card }];
  return resolveTrick(hypothetical, trumpSuit, ruleSet) === player;
}

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
 * How dangerous it is to be holding `card` in this negative hand type — used to prioritize what
 * to discard first when void and free to play anything. Higher means "discard sooner."
 */
function dangerScore(card: Card, handType: NegativeHandType): number {
  switch (handType) {
    case "noHearts":
      return card.suit === "H" ? 100 + card.rank : 0;
    case "noKingOfHearts":
      return card.suit === "H" && card.rank === 13 ? 1000 : 0;
    case "noGentlemen":
      return card.rank === 13 || card.rank === 11 ? 100 + card.rank : 0;
    case "noLady":
      return card.rank === 12 ? 100 + card.rank : 0;
    case "noTricks":
    case "noLastTwo":
      return card.rank;
  }
}

function mostDangerous(cards: Card[], handType: NegativeHandType): Card {
  return cards.reduce((best, c) => (dangerScore(c, handType) > dangerScore(best, handType) ? c : best));
}

// No Last Two Tricks: only the final 2 tricks (13 total) carry any penalty risk. Tricks before
// that are free to win — the skill's own guidance: "track trick count remaining; bias toward not
// winning tricks 12 and 13 in particular, which requires the bot to reason about trick-count, not
// just card rank."
const NO_LAST_TWO_SAFE_TRICKS = 11;

/**
 * Leading a positive-hand trick, aware of what's already been played and shown void (`tracker`) —
 * the "normal" difficulty's specific improvement over always leading the flat-highest card:
 *
 * 1. A "master" card (guaranteed the highest remaining of its suit — see `isMasterCard`) is the
 *    strongest available signal short of a full search; lead the master from the longest such
 *    suit, extending control over that suit as long as possible.
 * 2. Failing that, with real trump length (3+) and a trump in play, lead trump to draw out
 *    opponents' trumps while still in control, rather than risking a side-suit lead into a ruff.
 * 3. Otherwise, lead the highest card from whichever suit is both long in hand and has the fewest
 *    opponents already known void in it (fewer void opponents = lower ruff risk).
 */
function bestMaster(cards: Card[], hand: Card[], tracker: CardTracker, ruleSet: RuleSet): Card | null {
  const masters = cards.filter((c) => isMasterCard(c, hand, tracker));
  return masters.length > 0 ? highestCard(masters, ruleSet.backwards) : null;
}

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

  // No guaranteed winner available. With real trump length, lead trump to draw opponents' trumps
  // out while still in control, rather than risking an unproven side-suit lead into a ruff.
  if (trumpSuit !== null && suitLength(hand, trumpSuit) >= 3) {
    const trumpCards = bySuit.get(trumpSuit);
    if (trumpCards !== undefined) return highestCard(trumpCards, ruleSet.backwards);
  }

  // Otherwise, the safest available lead: fewest known-void opponents, then longest suit, then —
  // if suits are still tied on both — whichever suit's own best card outranks the others', so
  // this degrades to "just lead the single highest legal card" exactly when length/void give no
  // real signal, rather than an arbitrary pick among equally-long, equally-safe suits.
  const suits = [...bySuit.keys()].sort((a, b) => {
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

function chooseCardCore(state: GameState, player: PlayerIndex, tracking: boolean): Card {
  const legal = legalCardsFor(state, player);
  if (legal.length === 1) return legal[0];

  const ruleSet = currentRuleSet(state);
  const isPositive = state.handType === "positive";

  if (state.handType === "noLastTwo" && state.completedTricks.length < NO_LAST_TWO_SAFE_TRICKS) {
    // Winning right now is free — shed the highest card while there's no cost to it, rather than
    // hoarding high cards defensively (which only leaves them stuck holding danger once tricks
    // 12-13 actually arrive). Applies whether leading, following, or discarding void: dumping the
    // single highest legal card is always the right move here, no other logic needed.
    return highestCard(legal, ruleSet.backwards);
  }

  if (state.currentTrick.length === 0) {
    // Leading: "would currently win" is vacuous (nothing to beat yet), so this is handled
    // separately — negative hands lead low (safest; there's no trump to weigh and a global-lowest
    // lead maximizes safety on the trick actually in front of them, so tracking doesn't change
    // this branch), positive hands lead high, tracking-aware when enabled.
    if (!isPositive) return lowestCard(legal, ruleSet.backwards);
    if (!tracking) return highestCard(legal, ruleSet.backwards);
    return choosePositiveLead(state, player, legal, trackCards(state), ruleSet, currentTrumpSuit(state));
  }

  const trumpSuit = currentTrumpSuit(state);
  const winners = legal.filter((card) => wouldCurrentlyWin(state, player, card, trumpSuit, ruleSet));
  const nonWinners = legal.filter((card) => !winners.includes(card));

  if (isPositive) {
    if (winners.length > 0) return lowestCard(winners, ruleSet.backwards); // win as cheaply as possible
    return lowestCard(nonWinners.length > 0 ? nonWinners : legal, ruleSet.backwards); // duck cheaply, preserve strong cards
  }

  if (nonWinners.length === 0) return lowestCard(legal, ruleSet.backwards); // forced to win — least-bad option

  const ledSuit = state.currentTrick[0].card.suit;
  const isVoidDiscard = !legal.some((c) => c.suit === ledSuit);
  return isVoidDiscard
    ? mostDangerous(nonWinners, state.handType as NegativeHandType)
    : lowestCard(nonWinners, ruleSet.backwards); // following suit: duck under with the lowest safe card
}

// How often "easy" ignores its own heuristic and just plays a uniformly random legal card instead
// — enough to be a noticeably weaker, less consistent opponent without playing outright illegally
// or nonsensically most of the time.
const EASY_RANDOMNESS = 0.2;

/**
 * Picks a card to play for `player`, given the full game state. Tier 1 heuristic bot — see
 * .claude/skills/king-ai-opponent. Always legal: every branch chooses only from `legalCardsFor`,
 * never a hand-rolled legality check.
 *
 * The core trick: reuse `resolveTrick` itself (via `wouldCurrentlyWin`) to ask "would playing
 * this card currently win the trick?" — that single primitive drives both "avoid winning"
 * (negative hands) and "win cheaply" (positive hands) without reimplementing rank/trump
 * comparisons.
 *
 * `difficulty` (default "normal") controls how the bot uses this: see the `Difficulty` doc above.
 */
export function chooseCard(
  state: GameState,
  player: PlayerIndex,
  difficulty: Difficulty = "normal",
  random: RandomSource = Math.random,
): Card {
  if (difficulty === "normal") return chooseCardCore(state, player, true);

  const legal = legalCardsFor(state, player);
  if (legal.length > 1 && random() < EASY_RANDOMNESS) {
    return legal[Math.floor(random() * legal.length)];
  }
  return chooseCardCore(state, player, false);
}
