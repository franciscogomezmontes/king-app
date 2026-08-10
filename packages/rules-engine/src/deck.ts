import { Card, PlayerIndex, RANKS, SUITS } from "./types";

/** A standard 52-card deck, unshuffled, in a fixed deterministic order. */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

/** A source of randomness the caller controls, so shuffles are testable/seedable. */
export type RandomSource = () => number;

/** Fisher-Yates shuffle. Does not mutate the input; returns a new array. */
export function shuffle(deck: Card[], random: RandomSource = Math.random): Card[] {
  const result = deck.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Deals a 52-card deck into 4 hands of 13 cards each, dealt round-robin as at a real table. */
export function deal(deck: Card[]): Record<PlayerIndex, Card[]> {
  if (deck.length !== 52) {
    throw new Error(`deal() requires exactly 52 cards, got ${deck.length}`);
  }
  const hands: Record<PlayerIndex, Card[]> = { 0: [], 1: [], 2: [], 3: [] };
  deck.forEach((card, i) => {
    const player = (i % 4) as PlayerIndex;
    hands[player].push(card);
  });
  return hands;
}
