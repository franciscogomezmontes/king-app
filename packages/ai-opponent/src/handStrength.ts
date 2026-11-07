import { Card, Suit, SUITS } from "rules-engine";

function groupBySuit(hand: Card[]): Record<Suit, Card[]> {
  const bySuit: Record<Suit, Card[]> = { S: [], H: [], D: [], C: [] };
  for (const card of hand) bySuit[card.suit].push(card);
  return bySuit;
}

/**
 * Standard "quick tricks" table for one suit's held cards — only Ace/King-headed holdings count.
 * A lone Queen or Jack essentially never reliably wins a trick on its own (some higher card is
 * still out there and nothing protects it), so it earns no credit here — unlike the old flat
 * high-card-point formula, which scored a hand full of unsupported face cards the same as a hand
 * full of aces. That gap was the root cause of bots routinely bidding 5, a bid a real player at
 * this table would only make on a truly exceptional hand — see .claude/skills/king-ai-opponent.
 */
function suitQuickTricks(cards: Card[]): number {
  const ranks = new Set(cards.map((c) => c.rank));
  const hasAce = ranks.has(14);
  const hasKing = ranks.has(13);
  const hasQueen = ranks.has(12);
  if (hasAce && hasKing) return 2; // AK: two sure tricks
  if (hasAce && hasQueen) return 1.25; // AQ: the ace is sure, the queen only a real chance once the king falls
  if (hasAce) return 1; // a bare ace is still always a sure trick on suit alone
  if (hasKing && hasQueen) return 0.75; // KQ: a real chance once someone else has played the ace, not a sure thing
  if (hasKing && cards.length >= 2) return 0.4; // a backed (non-singleton) king: a real chance, not a sure thing
  return 0; // a singleton king, or anything headed by Q/J or lower, isn't reliable enough to count
}

/**
 * Suits at least this long can generate extra winners purely from length, once trumps are drawn
 * or the suit is otherwise established. Tunable — see .claude/skills/king-ai-opponent.
 */
const LENGTH_BONUS_MIN_LENGTH = 6;
const LENGTH_BONUS_PER_EXTRA_CARD = 0.4;

/**
 * Only a suit with real head strength (`suitQuickTricks` above) gets to run long enough to cash
 * in its length — an unheaded long suit of low cards won't establish itself before the hand's
 * over, so it earns no bonus regardless of how many cards it has.
 */
function suitLengthBonus(cards: Card[], quickTricks: number): number {
  if (quickTricks === 0) return 0;
  const extra = cards.length - LENGTH_BONUS_MIN_LENGTH + 1;
  return extra > 0 ? extra * LENGTH_BONUS_PER_EXTRA_CARD : 0;
}

/**
 * Tier-1 estimate of how many tricks this hand is likely to capture — shared by trump-selection
 * (`shouldOpenAuction`), auction bidding (`chooseBid`), and the dealer's sell/keep decision
 * (`chooseDealerDecision`). All three consult this one function, so they're automatically
 * consistent with each other: a dealer's "should I sell" call and a bidder's "what should I bid"
 * call always agree on what a given hand is worth.
 *
 * Modeled as "quick tricks" (suit-by-suit, from the standard trick-taking convention of scoring
 * unbroken top-of-suit sequences and backed honors) plus a length bonus for a genuinely long suit
 * that's also headed by real strength — not a blanket high-card-point average. The old formula
 * (`points / 3`, `Ace=4, King=3, Queen=2, Jack=1`) routinely produced bids of 5, which real-table
 * play at this family's table treats as essentially never seen outside a truly exceptional hand
 * (3 is already a strong bid, 4 is rare). `handStrength.test.ts` asserts the resulting bid
 * distribution against those norms directly across hundreds of simulated deals, rather than
 * trusting the formula by inspection alone — the exact weights above are tunable, but re-run that
 * test after changing them.
 */
export function estimateTricks(hand: Card[]): number {
  const bySuit = groupBySuit(hand);
  let total = 0;
  for (const suit of SUITS) {
    const cards = bySuit[suit];
    const quick = suitQuickTricks(cards);
    total += quick + suitLengthBonus(cards, quick);
  }
  return Math.round(total);
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
