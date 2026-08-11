import { AuctionResult } from "./auction";
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

/** Scores one negative hand. Returns each player's point change (always <= 0). */
export function scoreNegativeHand(
  handType: NegativeHandType,
  hand: HandResult,
): Record<PlayerIndex, number> {
  const scores = zeroScores();

  switch (handType) {
    case "noTricks": {
      for (const trick of hand) scores[trick.winner] += -20;
      break;
    }
    case "noHearts": {
      for (const player of PLAYERS) {
        const hearts = cardsWonBy(hand, player).filter((c) => c.suit === "H").length;
        scores[player] += -20 * hearts;
      }
      break;
    }
    case "noGentlemen": {
      for (const player of PLAYERS) {
        const count = cardsWonBy(hand, player).filter(
          (c) => c.rank === 13 || c.rank === 11,
        ).length;
        scores[player] += -30 * count;
      }
      break;
    }
    case "noLady": {
      for (const player of PLAYERS) {
        const queens = cardsWonBy(hand, player).filter((c) => c.rank === 12).length;
        scores[player] += -50 * queens;
      }
      break;
    }
    case "noKingOfHearts": {
      for (const player of PLAYERS) {
        const gotIt = cardsWonBy(hand, player).some((c) => c.suit === "H" && c.rank === 13);
        if (gotIt) scores[player] += -160;
      }
      break;
    }
    case "noLastTwo": {
      const lastTwo = hand.slice(-2);
      for (const trick of lastTwo) scores[trick.winner] += -90;
      break;
    }
  }

  return scores;
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
 * Scores one positive hand. Default direction "up" pays +25/trick captured. "down" (the
 * "Playing Down" alternative rule) starts every player at 325 and deducts 75/trick captured.
 * Both directions always sum to exactly POSITIVE_HAND_TOTAL (325) across the 4 players,
 * regardless of how the 13 tricks were distributed — that's what makes the whole game zero-sum
 * independent of which direction the dealer chooses.
 *
 * `auction`, if given, is applied via `applyAuctionTransfer` before the per-trick payout is
 * computed — see CLAUDE.md's auction bid transfer note.
 */
export function scorePositiveHand(
  hand: HandResult,
  direction: "up" | "down" = "up",
  auction: AuctionResult | null = null,
): Record<PlayerIndex, number> {
  const scores = zeroScores();
  const rawTricksWon = zeroScores();
  for (const trick of hand) rawTricksWon[trick.winner] += 1;
  const tricksWon = applyAuctionTransfer(rawTricksWon, auction);

  for (const player of PLAYERS) {
    scores[player] =
      direction === "up" ? 25 * tricksWon[player] : 325 - 75 * tricksWon[player];
  }

  return scores;
}
