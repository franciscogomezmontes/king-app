import { create, StoreApi, UseBoundStore } from "zustand";
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

/** The cards on the table right now, in play order — same shape as GameState.currentTrick. */
export type DisplayTrick = { player: PlayerIndex; card: Card }[];

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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// How long a completed trick's 4 cards stay fully visible before the table clears for the next
// one — otherwise a trick-completing play and the reset to an empty table happen in the very same
// state transition, and the human never actually sees what was won. Skipped entirely (both this
// and BOT_THINK_DELAY_MS) when botDelayMs is explicitly 0, e.g. in tests driving the game fast.
const TRICK_REVEAL_MS = 1100;
const DEFAULT_BOT_THINK_MS = 550;

type OnStep = (state: GameState, biddingIndex: number, displayTrick: DisplayTrick) => void;

/**
 * Applies one action (or a bid "pass") and reports it to `onStep` — pausing first to reveal the
 * completed trick's 4 cards if this play just finished one, so "the table clears itself" never
 * happens in the same instant as "the last card lands." Shared by the human's own moves and every
 * bot decision, so both get identical pacing/visibility.
 */
async function applyStepWithReveal(
  current: GameState,
  biddingIndex: number,
  result: GameAction | "pass",
  botDelayMs: number,
  onStep: OnStep,
): Promise<{ state: GameState; biddingIndex: number }> {
  const tricksBefore = current.completedTricks.length;
  const stepped = applyDecisionResult(current, biddingIndex, result);

  if (stepped.state.completedTricks.length > tricksBefore) {
    const justCompleted = stepped.state.completedTricks[stepped.state.completedTricks.length - 1];
    onStep(stepped.state, stepped.biddingIndex, justCompleted.plays);
    if (botDelayMs > 0) await delay(TRICK_REVEAL_MS);
  }
  onStep(stepped.state, stepped.biddingIndex, stepped.state.currentTrick);
  return stepped;
}

/** Runs system steps and bot decisions until it's the human's turn (or the game is over),
 * pausing before each bot decision so its card is visibly "played," not just instantly present. */
async function autoPlay(
  state: GameState,
  humanSeat: PlayerIndex,
  bot: Bot,
  random: RandomSource,
  biddingIndex: number,
  botDelayMs: number,
  onStep: OnStep,
): Promise<void> {
  let current = state;
  let bi = biddingIndex;
  for (;;) {
    const decision = pendingDecision(current, bi);
    if (decision.kind === "done") return;
    if (decision.kind === "deal" || decision.kind === "advance") {
      current = systemStep(current, decision.kind, random);
      bi = 0;
      onStep(current, bi, current.currentTrick);
      continue;
    }
    if (decision.player === humanSeat) return;
    if (botDelayMs > 0) await delay(botDelayMs);
    const stepped = await applyStepWithReveal(current, bi, botAction(current, decision, bot), botDelayMs, onStep);
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
  /** Pause before each bot decision, and (if non-zero) the trick-reveal pause too. Defaults to a
   * real, watchable pace; pass 0 to disable all pacing entirely — for tests driving full games
   * programmatically, not for real play. */
  botDelayMs?: number;
}

export interface GameStore {
  game: GameState;
  humanSeat: PlayerIndex;
  difficulty: Difficulty;
  biddingIndex: number;
  /** What the table should render right now — normally mirrors game.currentTrick, except it
   * briefly holds a just-completed trick's 4 cards during the reveal pause. */
  displayTrick: DisplayTrick;
  playCard: (card: Card) => void;
  declareTrump: (choice: TrumpChoice) => void;
  openAuction: () => void;
  submitBid: (tricks: number) => void;
  passBid: () => void;
  dealerDecide: (sell: boolean) => void;
  /** Resolves once any in-flight bot auto-play / trick-reveal pause has settled. The real UI
   * doesn't need this — it just reacts to state as it streams in — but tests driving a full game
   * programmatically need to know when it's safe to read state / dispatch the next move. */
  waitForIdle: () => Promise<void>;
}

/**
 * Builds a fresh game store. One instance per game session — the caller creates a new one via
 * `useState(() => createGameStore(options))` when starting a game, the same pattern already used
 * for `initI18n()` in this app.
 */
export function createGameStore(options: NewGameOptions): GameStoreHook {
  const random = options.random ?? Math.random;
  const botDelayMs = options.botDelayMs ?? DEFAULT_BOT_THINK_MS;
  const bot = makeBot(options.difficulty, random);
  let pending: Promise<void> = Promise.resolve();

  const store = create<GameStore>((set, get) => {
    function onStep(state: GameState, biddingIndex: number, displayTrick: DisplayTrick) {
      set({ game: state, biddingIndex, displayTrick });
    }

    async function runStep(result: GameAction | "pass") {
      const { game, biddingIndex, humanSeat } = get();
      // No pre-delay for the human's own move — they already deliberated by tapping — but a
      // trick they complete still gets the same reveal pause as anyone else's.
      const afterHuman = await applyStepWithReveal(game, biddingIndex, result, botDelayMs, onStep);
      await autoPlay(afterHuman.state, humanSeat, bot, random, afterHuman.biddingIndex, botDelayMs, onStep);
    }

    function dispatch(result: GameAction | "pass") {
      pending = runStep(result);
    }

    return {
      game: createGame(options.ruleSet, options.firstDealer),
      humanSeat: options.humanSeat,
      difficulty: options.difficulty,
      biddingIndex: 0,
      displayTrick: [],
      playCard: (card) => dispatch({ type: "PLAY_CARD", player: get().humanSeat, card }),
      declareTrump: (choice) =>
        dispatch({
          type: "DECLARE_TRUMP",
          player: get().humanSeat,
          trump: choice.trump,
          direction: choice.direction,
          backwards: choice.backwards,
        }),
      openAuction: () => dispatch({ type: "OPEN_AUCTION", player: get().humanSeat }),
      submitBid: (tricks) => dispatch({ type: "SUBMIT_BID", player: get().humanSeat, tricks }),
      passBid: () => dispatch("pass"),
      dealerDecide: (sell) => dispatch({ type: "DEALER_DECIDE", player: get().humanSeat, sell }),
      waitForIdle: () => pending,
    };
  });

  // Kick off dealing (+ any bot decisions before the first human turn) right away.
  pending = autoPlay(
    store.getState().game,
    options.humanSeat,
    bot,
    random,
    0,
    botDelayMs,
    (state, biddingIndex, displayTrick) => store.setState({ game: state, biddingIndex, displayTrick }),
  );

  return store;
}

export type GameStoreHook = UseBoundStore<StoreApi<GameStore>>;
