/**
 * Core types for the King rules engine.
 *
 * This package is the single source of truth for game logic. It has no UI or network
 * dependencies. See CLAUDE.md and .claude/skills/king-rules-engine for the ground-truth
 * scoring rules and invariants this package must preserve.
 */

export type Suit = "S" | "H" | "D" | "C";

/** 11 = Jack, 12 = Queen, 13 = King, 14 = Ace (aces high). */
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

export interface Card {
  suit: Suit;
  rank: Rank;
}

export const SUITS: Suit[] = ["S", "H", "D", "C"];
export const RANKS: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

/** Player seats, fixed at 4 for the base game. */
export type PlayerIndex = 0 | 1 | 2 | 3;

/** The six negative (avoid-capturing) hands, in fixed play order. */
export type NegativeHandType =
  | "noTricks"
  | "noHearts"
  | "noGentlemen"
  | "noLady"
  | "noKingOfHearts"
  | "noLastTwo";

export const NEGATIVE_HAND_ORDER: NegativeHandType[] = [
  "noTricks",
  "noHearts",
  "noGentlemen",
  "noLady",
  "noKingOfHearts",
  "noLastTwo",
];

/** A single trick: one card played by each of the 4 players, and who won it. */
export interface Trick {
  /** Cards played this trick, in play order (first = led). */
  plays: { player: PlayerIndex; card: Card }[];
  winner: PlayerIndex;
}

/** A completed hand's 13 tricks, in the order they were played. */
export type HandResult = Trick[];

/**
 * The alternative-rules toggle menu (positive hands only). Phase 1 (this package's initial
 * scope) implements scoring for `playingDirection` since it's cheap and directly affects
 * scoring math. `mandatoryKilling`, `auctionMustSell`, and `backwards` are legality/auction
 * concerns wired up in Phase 2 — see the Notion "King App — Project Plan" phase 2 entry.
 *
 * Defaults here MUST match plain base-rules behavior: adding a new toggle must never change
 * existing behavior for players who haven't turned it on.
 */
export interface RuleSet {
  mandatoryKilling: boolean;
  auctionMustSell: boolean;
  playingDirection: "up" | "down";
  backwards: boolean;
}

export const DEFAULT_RULE_SET: RuleSet = {
  mandatoryKilling: false,
  auctionMustSell: false,
  playingDirection: "up",
  backwards: false,
};
