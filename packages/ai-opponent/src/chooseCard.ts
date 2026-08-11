import {
  Card,
  currentRuleSet,
  currentTrumpSuit,
  GameState,
  legalCardsFor,
  NegativeHandType,
  PlayerIndex,
  rankValue,
  resolveTrick,
  RuleSet,
  TrumpSuit,
} from "rules-engine";

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

/**
 * Picks a card to play for `player`, given the full game state. Tier 1 heuristic bot — see
 * .claude/skills/king-ai-opponent. Always legal: every branch below chooses only from
 * `legalCardsFor`, never a hand-rolled legality check.
 *
 * The core trick: reuse `resolveTrick` itself (via `wouldCurrentlyWin`) to ask "would playing
 * this card currently win the trick?" — that single primitive drives both "avoid winning"
 * (negative hands) and "win cheaply" (positive hands) without reimplementing rank/trump
 * comparisons.
 */
export function chooseCard(state: GameState, player: PlayerIndex): Card {
  const legal = legalCardsFor(state, player);
  if (legal.length === 1) return legal[0];

  const ruleSet = currentRuleSet(state);
  const isPositive = state.handType === "positive";

  if (state.currentTrick.length === 0) {
    // Leading: "would currently win" is vacuous (nothing to beat yet), so this is handled
    // separately — negative hands lead low (safest), positive hands lead high (aggressive).
    return isPositive ? highestCard(legal, ruleSet.backwards) : lowestCard(legal, ruleSet.backwards);
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
