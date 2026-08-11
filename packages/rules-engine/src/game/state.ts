import { AuctionBid, AuctionResult } from "../auction";
import {
  Card,
  HandResult,
  NegativeHandType,
  NEGATIVE_HAND_ORDER,
  PlayerIndex,
  Trick,
  TrumpSuit,
} from "../types";

/**
 * The game-setup menu a player configures once per game — distinct from `RuleSet` (types.ts),
 * which is "what's in effect for one specific computation" and is consumed as-is, unchanged, by
 * `legalPlays`/`resolveTrick`/`scorePositiveHand`/`resolveAuction`. `GameRules` instead gates
 * what a trump-namer is even allowed to choose on a given positive hand: if `playingDownEnabled`
 * is false, every positive hand is scored "up" and the dealer is never offered "down"; if
 * `backwardsEnabled` is false, no positive hand may go backwards. See `declareTrump` in
 * actions.ts for where that gate is enforced, and its doc-comment for how a per-hand *effective*
 * `RuleSet` gets composed from `GameRules` + the hand's live choice.
 */
export interface GameRules {
  mandatoryKilling: boolean;
  auctionMustSell: boolean;
  playingDownEnabled: boolean;
  backwardsEnabled: boolean;
}

export const DEFAULT_GAME_RULES: GameRules = {
  mandatoryKilling: false,
  auctionMustSell: false,
  playingDownEnabled: false,
  backwardsEnabled: false,
};

/** The ten hands of a game, in fixed play order: the six negative hands, then four positive hands. */
export type HandType = NegativeHandType | "positive";

export const HAND_SEQUENCE: HandType[] = [
  ...NEGATIVE_HAND_ORDER,
  "positive",
  "positive",
  "positive",
  "positive",
];

export type GamePhase =
  | "awaiting-deal"
  | "trump-selection" // positive hands only
  | "auction-bidding" // positive hands only
  | "playing"
  | "hand-complete"
  | "game-complete";

/** Positive-hand-only state; present iff HAND_SEQUENCE[handIndex] === "positive". */
export interface PositiveHandSetup {
  /** Dealer initially; becomes the auction winner if the dealer sells. */
  trumpNamer: PlayerIndex;
  /** null until DECLARE_TRUMP. */
  trump: TrumpSuit | null;
  /** Chosen live at DECLARE_TRUMP, gated by GameRules.playingDownEnabled. */
  direction: "up" | "down";
  /** Chosen live at DECLARE_TRUMP, gated by GameRules.backwardsEnabled. */
  backwards: boolean;
  /** Guards against opening a second auction on the same hand. */
  auctionOpened: boolean;
  bids: AuctionBid[];
  auction: AuctionResult | null;
}

export interface HandHistoryEntry {
  handType: HandType;
  dealer: PlayerIndex;
  result: HandResult;
  positiveSetup: PositiveHandSetup | null;
  /** This hand's score delta only, not the running total. */
  scores: Record<PlayerIndex, number>;
}

export interface GameState {
  ruleSet: GameRules;
  /** Who dealt hand 0 — kept for the whole game so `advanceHand` can rotate off of it. */
  firstDealer: PlayerIndex;
  /** 0-9, index into HAND_SEQUENCE. */
  handIndex: number;
  /** HAND_SEQUENCE[handIndex], denormalized for cheap reads. */
  handType: HandType;
  dealer: PlayerIndex;
  phase: GamePhase;
  /** Each player's remaining cards this hand. */
  hands: Record<PlayerIndex, Card[]>;
  /** This hand's tricks completed so far. */
  completedTricks: Trick[];
  /** The in-progress trick's plays so far, in play order. */
  currentTrick: { player: PlayerIndex; card: Card }[];
  currentTurn: PlayerIndex;
  positiveSetup: PositiveHandSetup | null;
  cumulativeScores: Record<PlayerIndex, number>;
  handHistory: HandHistoryEntry[];
}

function zeroScores(): Record<PlayerIndex, number> {
  return { 0: 0, 1: 0, 2: 0, 3: 0 };
}

export function createGame(ruleSet: GameRules, firstDealer: PlayerIndex): GameState {
  return {
    ruleSet,
    firstDealer,
    handIndex: 0,
    handType: HAND_SEQUENCE[0],
    dealer: firstDealer,
    phase: "awaiting-deal",
    hands: { 0: [], 1: [], 2: [], 3: [] },
    completedTricks: [],
    currentTrick: [],
    currentTurn: firstDealer,
    positiveSetup: null,
    cumulativeScores: zeroScores(),
    handHistory: [],
  };
}
