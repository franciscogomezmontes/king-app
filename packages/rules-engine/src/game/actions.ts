import { highestBid, resolveAuction } from "../auction";
import { deal } from "../deck";
import { canLeadHearts, legalPlays } from "../legality";
import { scoreNegativeHand, scorePositiveHand } from "../scoring";
import { resolveTrick } from "../trick";
import { Card, DEFAULT_RULE_SET, HandResult, NegativeHandType, PlayerIndex, RuleSet, Trick, TrumpSuit } from "../types";
import { DealerRotation, FirstLeaderRule, rotateLeftEachHand, seatAfterDealer } from "./dealer";
import { GameState, HAND_SEQUENCE, HandHistoryEntry } from "./state";

export type GameAction =
  | { type: "DEAL_HAND"; deck: Card[] }
  | { type: "DECLARE_TRUMP"; player: PlayerIndex; trump: TrumpSuit; direction: "up" | "down"; backwards: boolean }
  | { type: "OPEN_AUCTION"; player: PlayerIndex }
  | { type: "SUBMIT_BID"; player: PlayerIndex; tricks: number }
  | { type: "DEALER_DECIDE"; player: PlayerIndex; sell: boolean }
  | { type: "PLAY_CARD"; player: PlayerIndex; card: Card }
  | { type: "ADVANCE_HAND" };

function sameCard(a: Card, b: Card): boolean {
  return a.suit === b.suit && a.rank === b.rank;
}

/**
 * The trump suit in effect for the current hand — always null for negative hands. Exported so a
 * caller (a test driver, or later an AI opponent) can compute `legalPlays(hand, trick,
 * currentTrumpSuit(state), currentRuleSet(state))` for the player to move without reimplementing
 * this lookup.
 */
export function currentTrumpSuit(state: GameState): TrumpSuit {
  return state.handType === "positive" ? state.positiveSetup!.trump : null;
}

/**
 * The RuleSet in effect for the current hand's legality/trick-resolution calls. Negative hands
 * never consult `state.ruleSet` — per CLAUDE.md, mandatory killing/backwards are "positive hands
 * only" — so this returns the plain `DEFAULT_RULE_SET` for them. Positive hands compose it from
 * `GameRules` (the game-wide toggles) plus this specific hand's live `direction`/`backwards`
 * choice, which `declareTrump` already validated against `GameRules.playingDownEnabled`/
 * `backwardsEnabled` before it was ever recorded — so no re-validation happens here. Exported for
 * the same reason as `currentTrumpSuit`.
 */
export function currentRuleSet(state: GameState): RuleSet {
  if (state.handType !== "positive") return DEFAULT_RULE_SET;
  const setup = state.positiveSetup!;
  return {
    mandatoryKilling: state.ruleSet.mandatoryKilling,
    auctionMustSell: state.ruleSet.auctionMustSell,
    playingDirection: setup.direction,
    backwards: setup.backwards,
  };
}

/** Deals the current hand and moves into trump-selection (positive hands) or straight into play. */
export function dealHand(
  state: GameState,
  deck: Card[],
  firstLeaderRule: FirstLeaderRule = seatAfterDealer,
): GameState {
  if (state.phase !== "awaiting-deal") {
    throw new Error(`dealHand: expected phase "awaiting-deal", got "${state.phase}"`);
  }
  const hands = deal(deck);

  if (state.handType === "positive") {
    return {
      ...state,
      hands,
      completedTricks: [],
      currentTrick: [],
      phase: "trump-selection",
      positiveSetup: {
        trumpNamer: state.dealer,
        trump: null,
        direction: "up",
        backwards: false,
        auctionOpened: false,
        bids: [],
        auction: null,
      },
    };
  }

  return {
    ...state,
    hands,
    completedTricks: [],
    currentTrick: [],
    phase: "playing",
    positiveSetup: null,
    currentTurn: firstLeaderRule(state.dealer),
  };
}

/** The trump-namer (dealer, or the auction winner) names trump/no-trump and this hand's direction/backwards choice. */
export function declareTrump(
  state: GameState,
  player: PlayerIndex,
  trump: TrumpSuit,
  direction: "up" | "down",
  backwards: boolean,
  firstLeaderRule: FirstLeaderRule = seatAfterDealer,
): GameState {
  if (state.phase !== "trump-selection" || state.positiveSetup === null) {
    throw new Error(`declareTrump: expected phase "trump-selection", got "${state.phase}"`);
  }
  if (player !== state.positiveSetup.trumpNamer) {
    throw new Error(`declareTrump: player ${player} may not name trump this hand`);
  }
  if (direction === "down" && !state.ruleSet.playingDownEnabled) {
    throw new Error("declareTrump: Playing Down is not enabled for this game");
  }
  if (backwards && !state.ruleSet.backwardsEnabled) {
    throw new Error("declareTrump: Backwards is not enabled for this game");
  }

  return {
    ...state,
    phase: "playing",
    currentTurn: firstLeaderRule(state.dealer),
    positiveSetup: { ...state.positiveSetup, trump, direction, backwards },
  };
}

/** The dealer opens their positive hand up to an auction instead of naming trump directly. */
export function openAuction(state: GameState, player: PlayerIndex): GameState {
  if (state.phase !== "trump-selection" || state.positiveSetup === null) {
    throw new Error(`openAuction: expected phase "trump-selection", got "${state.phase}"`);
  }
  if (player !== state.dealer) {
    throw new Error("openAuction: only the dealer may open an auction");
  }
  if (state.positiveSetup.auctionOpened) {
    throw new Error("openAuction: an auction has already been opened this hand");
  }

  return {
    ...state,
    phase: "auction-bidding",
    positiveSetup: { ...state.positiveSetup, auctionOpened: true },
  };
}

/** One of the three non-dealer players bids; a bid must strictly exceed the current high bid. */
export function submitBid(state: GameState, player: PlayerIndex, tricks: number): GameState {
  if (state.phase !== "auction-bidding" || state.positiveSetup === null) {
    throw new Error(`submitBid: expected phase "auction-bidding", got "${state.phase}"`);
  }
  if (player === state.dealer) {
    throw new Error("submitBid: the dealer may not bid in their own auction");
  }
  const currentHigh = highestBid(state.positiveSetup.bids)?.tricks ?? 0;
  if (tricks <= currentHigh) {
    throw new Error(`submitBid: bid of ${tricks} does not exceed the current high bid of ${currentHigh}`);
  }

  return {
    ...state,
    positiveSetup: { ...state.positiveSetup, bids: [...state.positiveSetup.bids, { player, tricks }] },
  };
}

/**
 * The dealer accepts or declines the auction's highest bid (forced to accept if
 * GameRules.auctionMustSell is on — see resolveAuction in auction.ts). Either way, bidding ends
 * and play returns to trump-selection: for the auction winner if the dealer sold, or back to the
 * dealer themself if not.
 */
export function resolveDealerDecision(state: GameState, player: PlayerIndex, sell: boolean): GameState {
  if (state.phase !== "auction-bidding" || state.positiveSetup === null) {
    throw new Error(`resolveDealerDecision: expected phase "auction-bidding", got "${state.phase}"`);
  }
  if (player !== state.dealer) {
    throw new Error("resolveDealerDecision: only the dealer decides whether to sell");
  }

  const ruleSetForAuction: RuleSet = { ...DEFAULT_RULE_SET, auctionMustSell: state.ruleSet.auctionMustSell };
  const auction = resolveAuction(state.positiveSetup.bids, state.dealer, sell, ruleSetForAuction);

  return {
    ...state,
    phase: "trump-selection",
    positiveSetup: {
      ...state.positiveSetup,
      trumpNamer: auction !== null ? auction.winner : state.dealer,
      auction,
    },
  };
}

/**
 * The cards `player` may legally play right now, given the full game state — combines
 * `legalPlays()` with the "a player may only lead a heart if hearts is all they have left"
 * restriction (No Hearts / No King of Hearts hands only), which is layered on here rather than
 * inside `legalPlays()` since that function is hand-type agnostic by design. This is exactly what
 * `playCard` validates a move against, so any caller that wants "what can I legally play right
 * now" — an AI, a UI, a test driver — should call this rather than calling `legalPlays()`
 * directly and risk missing the heart-leading special case.
 */
export function legalCardsFor(state: GameState, player: PlayerIndex): Card[] {
  const trumpSuit = currentTrumpSuit(state);
  const ruleSet = currentRuleSet(state);
  const hand = state.hands[player];
  const cardsPlayedThisTrick = state.currentTrick.map((p) => p.card);
  let legal = legalPlays(hand, cardsPlayedThisTrick, trumpSuit, ruleSet);
  if (
    cardsPlayedThisTrick.length === 0 &&
    (state.handType === "noHearts" || state.handType === "noKingOfHearts") &&
    !canLeadHearts(hand)
  ) {
    legal = legal.filter((c) => c.suit !== "H");
  }
  return legal;
}

/**
 * True once a negative hand's outcome is already fully locked in — every copy of the relevant
 * penalty card has already been captured by someone, so no further trick can change any player's
 * score. At that point the hand is over in every practical sense: continuing to play out the
 * remaining tricks (whose cards are now all scoring-irrelevant for this hand type) is pure
 * mechanical busywork, so `playCard` ends the hand right there instead of requiring all 13.
 * Doesn't apply to No Tricks or No Last Two Tricks — every trick can still matter for those right
 * up to the last one, so there's no point at which the outcome is knowable early.
 */
function isNegativeHandDecided(handType: NegativeHandType, completedTricks: Trick[]): boolean {
  const captured = (predicate: (card: Card) => boolean): number =>
    completedTricks.reduce((count, trick) => count + trick.plays.filter((p) => predicate(p.card)).length, 0);

  switch (handType) {
    case "noKingOfHearts":
      return captured((c) => c.suit === "H" && c.rank === 13) >= 1;
    case "noGentlemen":
      return captured((c) => c.rank === 13 || c.rank === 11) >= 8;
    case "noLady":
      return captured((c) => c.rank === 12) >= 4;
    case "noHearts":
      return captured((c) => c.suit === "H") >= 13;
    case "noTricks":
    case "noLastTwo":
      return false;
  }
}

/** A player plays a card to the current trick, resolving the trick (and the hand, if it was the 13th, or earlier if the hand is already decided — see isNegativeHandDecided) as needed. */
export function playCard(state: GameState, player: PlayerIndex, card: Card): GameState {
  if (state.phase !== "playing") {
    throw new Error(`playCard: expected phase "playing", got "${state.phase}"`);
  }
  if (player !== state.currentTurn) {
    throw new Error(`playCard: it is player ${state.currentTurn}'s turn, not ${player}'s`);
  }

  const legal = legalCardsFor(state, player);
  if (!legal.some((c) => sameCard(c, card))) {
    throw new Error(`playCard: ${card.suit}${card.rank} is not a legal play for player ${player}`);
  }

  const trumpSuit = currentTrumpSuit(state);
  const ruleSet = currentRuleSet(state);
  const hand = state.hands[player];
  const hands: Record<PlayerIndex, Card[]> = {
    ...state.hands,
    [player]: hand.filter((c) => !sameCard(c, card)),
  };
  const currentTrick = [...state.currentTrick, { player, card }];

  if (currentTrick.length < 4) {
    return { ...state, hands, currentTrick, currentTurn: ((player + 1) % 4) as PlayerIndex };
  }

  const winner = resolveTrick(currentTrick, trumpSuit, ruleSet);
  const completedTricks = [...state.completedTricks, { plays: currentTrick, winner }];

  const handDecided =
    completedTricks.length >= 13 ||
    (state.handType !== "positive" && isNegativeHandDecided(state.handType, completedTricks));

  if (!handDecided) {
    return { ...state, hands, currentTrick: [], completedTricks, currentTurn: winner };
  }

  const handResult: HandResult = completedTricks;
  const scores =
    state.handType === "positive"
      ? scorePositiveHand(handResult, state.positiveSetup!.direction, state.positiveSetup!.auction)
      : scoreNegativeHand(state.handType, handResult);

  const cumulativeScores: Record<PlayerIndex, number> = {
    0: state.cumulativeScores[0] + scores[0],
    1: state.cumulativeScores[1] + scores[1],
    2: state.cumulativeScores[2] + scores[2],
    3: state.cumulativeScores[3] + scores[3],
  };

  const historyEntry: HandHistoryEntry = {
    handType: state.handType,
    dealer: state.dealer,
    result: handResult,
    positiveSetup: state.positiveSetup,
    scores,
  };

  return {
    ...state,
    hands,
    currentTrick: [],
    completedTricks,
    phase: "hand-complete",
    cumulativeScores,
    handHistory: [...state.handHistory, historyEntry],
  };
}

/** Moves from a completed hand into the next one (or into game-complete after the 10th). */
export function advanceHand(state: GameState, dealerRotation: DealerRotation = rotateLeftEachHand): GameState {
  if (state.phase !== "hand-complete") {
    throw new Error(`advanceHand: expected phase "hand-complete", got "${state.phase}"`);
  }

  const nextHandIndex = state.handIndex + 1;
  if (nextHandIndex >= HAND_SEQUENCE.length) {
    return { ...state, phase: "game-complete" };
  }

  return {
    ...state,
    handIndex: nextHandIndex,
    handType: HAND_SEQUENCE[nextHandIndex],
    dealer: dealerRotation(nextHandIndex, state.firstDealer),
    phase: "awaiting-deal",
    hands: { 0: [], 1: [], 2: [], 3: [] },
    completedTricks: [],
    currentTrick: [],
    positiveSetup: null,
  };
}

export interface ApplyActionOptions {
  dealerRotation?: DealerRotation;
  firstLeaderRule?: FirstLeaderRule;
}

/** Uniform (state, action) -> state entry point for a UI store or a future Colyseus room handler. */
export function applyAction(state: GameState, action: GameAction, options: ApplyActionOptions = {}): GameState {
  switch (action.type) {
    case "DEAL_HAND":
      return dealHand(state, action.deck, options.firstLeaderRule);
    case "DECLARE_TRUMP":
      return declareTrump(
        state,
        action.player,
        action.trump,
        action.direction,
        action.backwards,
        options.firstLeaderRule,
      );
    case "OPEN_AUCTION":
      return openAuction(state, action.player);
    case "SUBMIT_BID":
      return submitBid(state, action.player, action.tricks);
    case "DEALER_DECIDE":
      return resolveDealerDecision(state, action.player, action.sell);
    case "PLAY_CARD":
      return playCard(state, action.player, action.card);
    case "ADVANCE_HAND":
      return advanceHand(state, options.dealerRotation);
    default: {
      const exhaustive: never = action;
      throw new Error(`applyAction: unhandled action ${JSON.stringify(exhaustive)}`);
    }
  }
}
