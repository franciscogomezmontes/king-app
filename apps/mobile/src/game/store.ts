import { create } from "zustand";
import * as aiOpponent from "ai-opponent";
import {
  applyAction,
  Card,
  createDeck,
  createGame,
  GameAction,
  GameRules,
  GameState,
  PlayerIndex,
  RandomSource,
  shuffle,
  TrumpSuit,
} from "rules-engine";
import { currentBidder } from "./auctionOrder";
import * as easyBot from "./easyBot";

export type Difficulty = "easy" | "normal";

export interface TrumpChoice {
  trump: TrumpSuit;
  direction: "up" | "down";
  backwards: boolean;
}

/** Both difficulties are shaped identically so the orchestration below never branches on which one it is. */
interface Bot {
  chooseCard(state: GameState, player: PlayerIndex): Card;
  shouldOpenAuction(state: GameState, player: PlayerIndex): boolean;
  chooseTrumpDeclaration(state: GameState, player: PlayerIndex): TrumpChoice;
  chooseBid(state: GameState, player: PlayerIndex): number | null;
  chooseDealerDecision(state: GameState, player: PlayerIndex): boolean;
}

function makeBot(difficulty: Difficulty, random: RandomSource): Bot {
  if (difficulty === "normal") return aiOpponent;
  return {
    chooseCard: (s, p) => easyBot.chooseCard(s, p, random),
    shouldOpenAuction: (s, p) => easyBot.shouldOpenAuction(s, p, random),
    chooseTrumpDeclaration: (s, p) => easyBot.chooseTrumpDeclaration(s, p, random),
    chooseBid: (s, p) => easyBot.chooseBid(s, p, random),
    chooseDealerDecision: (s, p) => easyBot.chooseDealerDecision(s, p, random),
  };
}

/** Whose decision is needed right now, and what kind — the UI reads this to know what to show. */
export type PendingDecision =
  | { kind: "deal" }
  | { kind: "trump"; player: PlayerIndex; canOpenAuction: boolean }
  | { kind: "bid"; player: PlayerIndex }
  | { kind: "dealer-decide"; player: PlayerIndex }
  | { kind: "play"; player: PlayerIndex }
  | { kind: "advance" }
  | { kind: "done" };

export function pendingDecision(state: GameState, biddingIndex: number): PendingDecision {
  switch (state.phase) {
    case "awaiting-deal":
      return { kind: "deal" };
    case "trump-selection": {
      const setup = state.positiveSetup!;
      return {
        kind: "trump",
        player: setup.trumpNamer,
        canOpenAuction: setup.trumpNamer === state.dealer && !setup.auctionOpened,
      };
    }
    case "auction-bidding": {
      const bidder = currentBidder(state.dealer, biddingIndex);
      return bidder !== null ? { kind: "bid", player: bidder } : { kind: "dealer-decide", player: state.dealer };
    }
    case "playing":
      return { kind: "play", player: state.currentTurn };
    case "hand-complete":
      return { kind: "advance" };
    case "game-complete":
      return { kind: "done" };
  }
}

type Decision = Extract<PendingDecision, { kind: "trump" | "bid" | "dealer-decide" | "play" }>;

/** What a bot would do for one non-system decision — either a GameAction to dispatch, or "pass" (decline to bid), which has no GameAction of its own. */
function botAction(state: GameState, decision: Decision, bot: Bot): GameAction | "pass" {
  switch (decision.kind) {
    case "trump": {
      if (decision.canOpenAuction && bot.shouldOpenAuction(state, decision.player)) {
        return { type: "OPEN_AUCTION", player: decision.player };
      }
      const choice = bot.chooseTrumpDeclaration(state, decision.player);
      return {
        type: "DECLARE_TRUMP",
        player: decision.player,
        trump: choice.trump,
        direction: choice.direction,
        backwards: choice.backwards,
      };
    }
    case "bid": {
      const tricks = bot.chooseBid(state, decision.player);
      return tricks === null ? "pass" : { type: "SUBMIT_BID", player: decision.player, tricks };
    }
    case "dealer-decide":
      return {
        type: "DEALER_DECIDE",
        player: decision.player,
        sell: bot.chooseDealerDecision(state, decision.player),
      };
    case "play":
      return { type: "PLAY_CARD", player: decision.player, card: bot.chooseCard(state, decision.player) };
  }
}

const RESETS_BIDDING_INDEX = new Set<GameAction["type"]>(["DEAL_HAND", "OPEN_AUCTION", "DEALER_DECIDE", "ADVANCE_HAND"]);

/** Applies one decision's result (a real action, or a bid-decline "pass") and keeps biddingIndex
 * bookkeeping in sync — the single place this logic lives, shared by bot and human moves alike. */
function applyDecisionResult(
  state: GameState,
  biddingIndex: number,
  result: GameAction | "pass",
): { state: GameState; biddingIndex: number } {
  if (result === "pass") return { state, biddingIndex: biddingIndex + 1 };
  const nextState = applyAction(state, result);
  const nextBiddingIndex =
    result.type === "SUBMIT_BID" ? biddingIndex + 1 : RESETS_BIDDING_INDEX.has(result.type) ? 0 : biddingIndex;
  return { state: nextState, biddingIndex: nextBiddingIndex };
}

function systemStep(state: GameState, kind: "deal" | "advance", random: RandomSource): GameState {
  if (kind === "deal") {
    return applyAction(state, { type: "DEAL_HAND", deck: shuffle(createDeck(), random) });
  }
  return applyAction(state, { type: "ADVANCE_HAND" });
}

/** Runs system steps and bot decisions until it's the human's turn (or the game is over). */
function autoPlay(
  state: GameState,
  humanSeat: PlayerIndex,
  bot: Bot,
  random: RandomSource,
  biddingIndex: number,
): { state: GameState; biddingIndex: number } {
  let current = state;
  let bi = biddingIndex;
  for (;;) {
    const decision = pendingDecision(current, bi);
    if (decision.kind === "done") return { state: current, biddingIndex: bi };
    if (decision.kind === "deal" || decision.kind === "advance") {
      current = systemStep(current, decision.kind, random);
      bi = 0;
      continue;
    }
    if (decision.player === humanSeat) return { state: current, biddingIndex: bi };
    const stepped = applyDecisionResult(current, bi, botAction(current, decision, bot));
    current = stepped.state;
    bi = stepped.biddingIndex;
  }
}

export interface NewGameOptions {
  ruleSet: GameRules;
  humanSeat: PlayerIndex;
  difficulty: Difficulty;
  firstDealer: PlayerIndex;
  /** Injectable for reproducible tests; defaults to Math.random for real play. */
  random?: RandomSource;
}

export interface GameStore {
  game: GameState;
  humanSeat: PlayerIndex;
  difficulty: Difficulty;
  biddingIndex: number;
  playCard: (card: Card) => void;
  declareTrump: (choice: TrumpChoice) => void;
  openAuction: () => void;
  submitBid: (tricks: number) => void;
  passBid: () => void;
  dealerDecide: (sell: boolean) => void;
}

/**
 * Builds a fresh game store. One instance per game session — the caller creates a new one via
 * `useState(() => createGameStore(options))` when starting a game, the same pattern already used
 * for `initI18n()` in this app.
 */
export function createGameStore(options: NewGameOptions) {
  const random = options.random ?? Math.random;
  const bot = makeBot(options.difficulty, random);

  const initial = autoPlay(
    createGame(options.ruleSet, options.firstDealer),
    options.humanSeat,
    bot,
    random,
    0,
  );

  return create<GameStore>((set, get) => {
    function advance(result: GameAction | "pass") {
      const { game, biddingIndex, humanSeat } = get();
      const stepped = applyDecisionResult(game, biddingIndex, result);
      const played = autoPlay(stepped.state, humanSeat, bot, random, stepped.biddingIndex);
      set({ game: played.state, biddingIndex: played.biddingIndex });
    }

    return {
      game: initial.state,
      humanSeat: options.humanSeat,
      difficulty: options.difficulty,
      biddingIndex: initial.biddingIndex,
      playCard: (card) => advance({ type: "PLAY_CARD", player: get().humanSeat, card }),
      declareTrump: (choice) =>
        advance({
          type: "DECLARE_TRUMP",
          player: get().humanSeat,
          trump: choice.trump,
          direction: choice.direction,
          backwards: choice.backwards,
        }),
      openAuction: () => advance({ type: "OPEN_AUCTION", player: get().humanSeat }),
      submitBid: (tricks) => advance({ type: "SUBMIT_BID", player: get().humanSeat, tricks }),
      passBid: () => advance("pass"),
      dealerDecide: (sell) => advance({ type: "DEALER_DECIDE", player: get().humanSeat, sell }),
    };
  });
}

export type GameStoreHook = ReturnType<typeof createGameStore>;
