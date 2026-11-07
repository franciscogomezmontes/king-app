import { Card, GameState, PlayerIndex, Rank, Suit } from "rules-engine";

const ALL_SEATS: PlayerIndex[] = [0, 1, 2, 3];

function cardKey(card: Card): string {
  return `${card.suit}${card.rank}`;
}

export interface CardTracker {
  /** Every card played so far this hand (completed tricks + the trick in progress). */
  playedCards: Set<string>;
  /** Suits each player is known void in, inferred from not following the led suit. */
  voidSuits: Record<PlayerIndex, Set<Suit>>;
}

/**
 * Builds a tracker of what's already known about this hand's cards purely from public
 * information already in `state` (completed tricks + the in-progress trick) — no peeking at
 * other players' hands. A player is inferred void in a suit the moment they're seen not
 * following it; that inference only gets more certain over the hand, never retracted.
 */
export function trackCards(state: GameState): CardTracker {
  const playedCards = new Set<string>();
  const voidSuits: Record<PlayerIndex, Set<Suit>> = { 0: new Set(), 1: new Set(), 2: new Set(), 3: new Set() };

  function observeTrick(plays: { player: PlayerIndex; card: Card }[]) {
    if (plays.length === 0) return;
    const ledSuit = plays[0].card.suit;
    for (const { player, card } of plays) {
      playedCards.add(cardKey(card));
      if (card.suit !== ledSuit) voidSuits[player].add(ledSuit);
    }
  }

  for (const trick of state.completedTricks) observeTrick(trick.plays);
  observeTrick(state.currentTrick);

  return { playedCards, voidSuits };
}

/**
 * A "master" card is the highest remaining card of its suit — no undealt-to-this-player, unseen
 * card of the same suit outranks it (checking both what's already been played and what's still in
 * `hand`, since those are the only ways a higher card could be accounted for). Leading a master is
 * the single strongest signal for "this will probably win the trick," short of a full search —
 * nothing left in play can beat it on suit alone (a trump ruff from a void opponent is the only
 * way it loses, which callers weigh separately via `voidSuits`).
 */
export function isMasterCard(card: Card, hand: Card[], tracker: CardTracker): boolean {
  for (let rank = card.rank + 1; rank <= 14; rank++) {
    const higher: Card = { suit: card.suit, rank: rank as Rank };
    if (tracker.playedCards.has(cardKey(higher))) continue;
    if (hand.some((c) => c.suit === higher.suit && c.rank === higher.rank)) continue;
    return false;
  }
  return true;
}

/** How many opponents (not `player`) are already known void in `suit` — leading into a suit with
 * known voids risks a trump ruff from whichever void opponent hasn't acted yet. */
export function opponentVoidCount(tracker: CardTracker, player: PlayerIndex, suit: Suit): number {
  return ALL_SEATS.filter((seat) => seat !== player && tracker.voidSuits[seat].has(suit)).length;
}

/**
 * Filters `legal` leads down to ones that aren't self-evidently dominated for a negative
 * (no-trump) hand: a card that's already the guaranteed highest remaining of its suit
 * (`isMasterCard`) is mathematically certain to win its own trick when led into an otherwise-
 * empty trick, since a negative hand never has trump to create any chance of it being beaten
 * (`currentTrumpSuit` is always null for negative hands — no trump exception to account for here
 * the way `choosePositiveLead`'s master-trump branch needs one). A negative hand's entire goal is
 * to avoid winning tricks, so leading a proven master is never correct except when every legal
 * lead is equally dominated (a genuinely forced position) — in that case this returns `legal`
 * unfiltered rather than an empty array. Only meaningful for leading into an empty trick in a
 * negative hand; callers are responsible for only invoking this in that context. Shared by
 * `chooseCardHeuristic`'s own negative-hand lead branch and `ismctsChooseCard`'s root candidate
 * set, so both tiers rely on the same domain fact instead of the heuristic dodging it by luck (its
 * "always lead the single lowest card" rule happens to avoid this in practice, but only
 * incidentally) and the search having no equivalent safeguard at all — see
 * .claude/skills/king-ai-opponent.
 */
export function nonDominatedLeads(legal: Card[], hand: Card[], tracker: CardTracker): Card[] {
  const safe = legal.filter((card) => !isMasterCard(card, hand, tracker));
  return safe.length > 0 ? safe : legal;
}
