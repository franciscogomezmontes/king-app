import { AuctionResult } from "./auction";
import { HandType } from "./game/state";
import { HandResult, NegativeHandType, PlayerIndex } from "./types";

const PLAYERS: PlayerIndex[] = [0, 1, 2, 3];

function zeroScores(): Record<PlayerIndex, number> {
  return { 0: 0, 1: 0, 2: 0, 3: 0 };
}

function cardsWonBy(hand: HandResult, player: PlayerIndex): { suit: string; rank: number }[] {
  const won: { suit: string; rank: number }[] = [];
  for (const trick of hand) {
    if (trick.winner === player) {
      for (const play of trick.plays) won.push(play.card);
    }
  }
  return won;
}

/**
 * Per-hand penalty totals, summed across all 4 players. These are the ground-truth constants
 * from CLAUDE.md / the Rules Reference doc — every negative hand's scoring function must sum
 * to exactly this value, for ANY distribution of captured cards, as long as all 13 tricks
 * (and therefore all 52 cards in that hand type's relevant suit/ranks) were actually captured
 * by someone. Property tests in test/scoring.test.ts assert this.
 */
export const NEGATIVE_HAND_TOTAL: Record<NegativeHandType, number> = {
  noTricks: -260,
  noHearts: -260,
  noGentlemen: -240,
  noLady: -200,
  noKingOfHearts: -160,
  noLastTwo: -180,
};

export const NEGATIVE_GAME_TOTAL = Object.values(NEGATIVE_HAND_TOTAL).reduce((a, b) => a + b, 0);
// -1300, matching the doc and the family's King Scorekeeper.xlsx.

export const POSITIVE_HAND_TOTAL = 325;
export const POSITIVE_GAME_TOTAL = POSITIVE_HAND_TOTAL * 4; // +1300

/**
 * Points lost per unit captured, for each negative hand — tricks/hearts/(kings+jacks)/queens/
 * capturing K♥/winning one of the last two tricks. This is the single home for these literals;
 * `scoreNegativeHand` below derives a per-player count from the actual play-by-play `HandResult`
 * and multiplies by this same table, so the two never drift apart.
 */
export const NEGATIVE_HAND_UNIT: Record<NegativeHandType, number> = {
  noTricks: -20,
  noHearts: -20,
  noGentlemen: -30,
  noLady: -50,
  noKingOfHearts: -160,
  noLastTwo: -90,
};

/**
 * How many units exist in total for each negative hand — i.e. what the four players' counts must
 * sum to (13 tricks, 13 hearts, 8 kings+jacks, 4 queens, exactly 1 K♥, 2 last-tricks). Doubles as
 * the per-hand-type ceiling on any one player's count. Matches `King Scorekeeper.xlsx`'s "#" column.
 */
export const NEGATIVE_HAND_EXPECTED_COUNT: Record<NegativeHandType, number> = {
  noTricks: 13,
  noHearts: 13,
  noGentlemen: 8,
  noLady: 4,
  noKingOfHearts: 1,
  noLastTwo: 2,
};

/** How many tricks exist in a positive hand — what the four players' trick counts must sum to. */
export const POSITIVE_HAND_EXPECTED_TRICKS = 13;

/**
 * Scores a negative hand directly from each player's already-known unit count (tricks captured,
 * hearts captured, etc.) rather than a play-by-play `HandResult` — the shape Scorekeeper mode
 * enters (mirroring `King Scorekeeper.xlsx`'s "Cantidad" column), where no individual card plays
 * are ever recorded, just each player's final tally.
 */
export function scoreNegativeHandFromCounts(
  handType: NegativeHandType,
  counts: Record<PlayerIndex, number>,
): Record<PlayerIndex, number> {
  const scores = zeroScores();
  const unit = NEGATIVE_HAND_UNIT[handType];
  // `|| 0` folds a zero count's `0 * unit === -0` back to plain 0 — a count of zero means no
  // points changed at all, not "negative zero," and callers doing exact equality checks should
  // see the same 0 the old per-trick-increment code always produced.
  for (const player of PLAYERS) scores[player] = counts[player] * unit || 0;
  return scores;
}

/** Scores one negative hand. Returns each player's point change (always <= 0). */
export function scoreNegativeHand(
  handType: NegativeHandType,
  hand: HandResult,
): Record<PlayerIndex, number> {
  const counts = zeroScores();

  switch (handType) {
    case "noTricks": {
      for (const trick of hand) counts[trick.winner] += 1;
      break;
    }
    case "noHearts": {
      for (const player of PLAYERS) {
        counts[player] = cardsWonBy(hand, player).filter((c) => c.suit === "H").length;
      }
      break;
    }
    case "noGentlemen": {
      for (const player of PLAYERS) {
        counts[player] = cardsWonBy(hand, player).filter(
          (c) => c.rank === 13 || c.rank === 11,
        ).length;
      }
      break;
    }
    case "noLady": {
      for (const player of PLAYERS) {
        counts[player] = cardsWonBy(hand, player).filter((c) => c.rank === 12).length;
      }
      break;
    }
    case "noKingOfHearts": {
      for (const player of PLAYERS) {
        const gotIt = cardsWonBy(hand, player).some((c) => c.suit === "H" && c.rank === 13);
        counts[player] = gotIt ? 1 : 0;
      }
      break;
    }
    case "noLastTwo": {
      const lastTwo = hand.slice(-2);
      for (const trick of lastTwo) counts[trick.winner] += 1;
      break;
    }
  }

  return scoreNegativeHandFromCounts(handType, counts);
}

/**
 * Applies an auction's trick transfer: `auction.bid` tricks move from `auction.winner`'s tally
 * to `auction.dealer`'s, before scoring. This is a pure redistribution between two players — the
 * total across all 4 players is unchanged — so it can never break the positive-hand zero-sum
 * invariant, no matter the bid size (including a bid that exceeds what `winner` actually
 * captured, which is a legal, if unlucky, outcome and simply yields a negative trick count for
 * scoring purposes). Returns `tricksWon` unchanged if there was no auction.
 */
export function applyAuctionTransfer(
  tricksWon: Record<PlayerIndex, number>,
  auction: AuctionResult | null,
): Record<PlayerIndex, number> {
  if (auction === null) return tricksWon;
  // Sequential mutation on a clone (rather than a single object literal with two computed keys)
  // so this stays correct even if winner and dealer were ever the same seat — the two updates
  // would otherwise collide and only the second key's write would stick.
  const result = { ...tricksWon };
  result[auction.winner] -= auction.bid;
  result[auction.dealer] += auction.bid;
  return result;
}

/**
 * Scores a positive hand directly from each player's final trick count — the shape Scorekeeper
 * mode enters (mirroring `King Scorekeeper.xlsx`'s "Cantidad" column for hands I-IV), where the
 * family records the already-settled trick tally per player directly, with no auction bid
 * transfer to model (that's settled physically at the table before anyone writes numbers down).
 * Default direction "up" pays +25/trick captured. "down" (the "Playing Down" alternative rule)
 * starts every player at 325 and deducts 75/trick captured. Both directions always sum to exactly
 * POSITIVE_HAND_TOTAL (325) across the 4 players, regardless of how the 13 tricks were
 * distributed — that's what makes the whole game zero-sum independent of which direction the
 * dealer chooses.
 */
export function scorePositiveHandFromTricks(
  tricksWon: Record<PlayerIndex, number>,
  direction: "up" | "down" = "up",
): Record<PlayerIndex, number> {
  const scores = zeroScores();
  for (const player of PLAYERS) {
    scores[player] =
      direction === "up" ? 25 * tricksWon[player] : 325 - 75 * tricksWon[player];
  }
  return scores;
}

/**
 * Scores one positive hand from its play-by-play `HandResult`. `auction`, if given, is applied
 * via `applyAuctionTransfer` before the per-trick payout is computed — see CLAUDE.md's auction
 * bid transfer note.
 */
export function scorePositiveHand(
  hand: HandResult,
  direction: "up" | "down" = "up",
  auction: AuctionResult | null = null,
): Record<PlayerIndex, number> {
  const rawTricksWon = zeroScores();
  for (const trick of hand) rawTricksWon[trick.winner] += 1;
  const tricksWon = applyAuctionTransfer(rawTricksWon, auction);
  return scorePositiveHandFromTricks(tricksWon, direction);
}

/**
 * The OK/Revisar check from `King Scorekeeper.xlsx`: do a hand's four entered counts actually sum
 * to what that hand type requires? Scorekeeper mode surfaces this live as counts are typed, but
 * never blocks on it — the spreadsheet itself never blocks either, and physical-card miscounts
 * happen.
 */
export interface HandCountValidation {
  ok: boolean;
  actualTotal: number;
  expectedTotal: number;
}

export function validateHandCounts(
  handType: HandType,
  counts: Record<PlayerIndex, number>,
): HandCountValidation {
  const expectedTotal =
    handType === "positive" ? POSITIVE_HAND_EXPECTED_TRICKS : NEGATIVE_HAND_EXPECTED_COUNT[handType];
  const actualTotal = PLAYERS.reduce<number>((sum, p) => sum + counts[p], 0);
  return { ok: actualTotal === expectedTotal, actualTotal, expectedTotal };
}
