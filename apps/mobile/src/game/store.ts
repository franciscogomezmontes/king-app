import { create, StoreApi, UseBoundStore } from "zustand";
import * as aiOpponent from "ai-opponent";
import {
  applyAction,
  canRequestRedeal,
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

export type Difficulty = "easy" | "normal" | "hard" | "expert";

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
  if (difficulty === "easy") {
    // "Easy" routes card play through ai-opponent's own easy difficulty (today's plain heuristic
    // plus some randomness — see chooseCard.ts) instead of a fully-random card pick, so the
    // difficulties are actually distinguishable in more than just bidding/trump/dealer choices.
    // Those four decisions still use the simple always-random easyBot module, unchanged.
    return {
      chooseCard: (s, p) => aiOpponent.chooseCard(s, p, "easy", random),
      shouldOpenAuction: (s, p) => easyBot.shouldOpenAuction(s, p, random),
      chooseTrumpDeclaration: (s, p) => easyBot.chooseTrumpDeclaration(s, p, random),
      chooseBid: (s, p) => easyBot.chooseBid(s, p, random),
      chooseDealerDecision: (s, p) => easyBot.chooseDealerDecision(s, p, random),
    };
  }
  // "normal"/"hard"/"expert" all share ai-opponent's Tier 1 bidding/trump/dealer-decision logic —
  // there's no search-based upgrade for those yet (see .claude/skills/king-ai-opponent), only for
  // card play itself: "normal" gets Tier 1's tracking-aware heuristic, "hard"/"expert" get ISMCTS
  // at their respective search budgets. `difficulty` flows straight through to ai-opponent's own
  // chooseCard, which already knows what each of those three means.
  return {
    chooseCard: (s, p) => aiOpponent.chooseCard(s, p, difficulty, random),
    shouldOpenAuction: aiOpponent.shouldOpenAuction,
    chooseTrumpDeclaration: aiOpponent.chooseTrumpDeclaration,
    chooseBid: aiOpponent.chooseBid,
    chooseDealerDecision: aiOpponent.chooseDealerDecision,
  };
}

/**
 * Runs `compute` and tops the elapsed time up to `minMs` before resolving — never adds delay on
 * top of a `compute` that already took at least that long. This is what makes bot pacing feel
 * consistent across every difficulty: "easy"/"normal"'s heuristic is near-instant, so this is
 * almost the whole pause; "hard"/"expert"'s ISMCTS search genuinely can take a while, but only
 * when there are 2+ legal cards to weigh — a forced single-legal-card play resolves in ~0ms
 * (`ismctsChooseCard`'s own early return) exactly as often as any other difficulty, and without
 * this top-up those moments would flash by with no pause at all while other moves from the same
 * bot visibly "think" for hundreds of ms — the jarring inconsistency that reads as broken
 * animations, not a difficulty-appropriate pace. Padding on top of Expert's 900ms budget, which
 * already exceeds any reasonable floor, is correctly a no-op.
 */
async function pacedDecision<T>(minMs: number, compute: () => T): Promise<T> {
  const start = Date.now();
  const result = compute();
  const elapsed = Date.now() - start;
  if (minMs > 0 && elapsed < minMs) await delay(minMs - elapsed);
  return result;
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

const RESETS_BIDDING_INDEX = new Set<GameAction["type"]>([
  "DEAL_HAND",
  "OPEN_AUCTION",
  "DEALER_DECIDE",
  "ADVANCE_HAND",
  "REQUEST_REDEAL",
]);

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

function dealStep(state: GameState, random: RandomSource): GameState {
  return applyAction(state, { type: "DEAL_HAND", deck: shuffle(createDeck(), random) });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * A zero-length but *real* macrotask yield (a `setTimeout`, not just an `await`ed already-resolved
 * promise, which only yields a microtask and never lets the browser paint) — the standard way to
 * let a just-applied state update actually reach the screen before the JS thread picks up its next
 * chunk of synchronous work. Critical specifically for "hard"/"expert": ISMCTS's search (ismcts.ts)
 * is one long synchronous call with no yield points inside it (see .claude/skills/king-ai-opponent's
 * "Performance" section — this is a known, deliberate trade-off, not a bug in the search itself).
 * Without a real yield *between* each bot's decision, several decisions in a row can run back-to-
 * back with no paint in between (every `await` in between them resolves immediately, since the
 * decision already took longer than `botDelayMs`, so `pacedDecision` adds no padding) — the human
 * sees every card in the trick pop in at once, well after tapping their own, instead of one at a
 * time with each one's fade-in actually visible.
 */
function yieldToBrowser(): Promise<void> {
  return delay(0);
}

// How long a completed trick's 4 cards stay fully visible before the table clears for the next
// one — otherwise a trick-completing play and the reset to an empty table happen in the very same
// state transition, and the human never actually sees what was won. Skipped entirely (both this
// and BOT_THINK_DELAY_MS) when botDelayMs is explicitly 0, e.g. in tests driving the game fast.
const TRICK_REVEAL_MS = 1100;
// The hand's very last trick gets noticeably longer on screen than a mid-hand one — it's not just
// clearing the table for another trick, it's the moment right before the screen jumps straight to
// the hand-complete scoreboard, so a mid-hand-length pause reads as "everything just vanished."
const HAND_COMPLETE_REVEAL_MS = 2600;
// A mid-hand trick clear stays on the Table component, so its 4 cards get a real fade-out
// (Table.tsx's TrickSlot, CARD_EXIT_MS) for free just by the screen not changing underneath them.
// The hand's *last* trick doesn't get that for free — GameScreen swaps straight from the Table to
// a whole different scoreboard component the instant the real "hand-complete" phase reaches it,
// which would unmount every TrickSlot mid-animation, undoing the fade-out this same trick would
// otherwise get. This is the buffer that keeps the table mounted (still reporting "playing," the
// same trick already used for HAND_COMPLETE_REVEAL_MS) just long enough for that exit-fade to
// actually finish playing before the real phase — and the scoreboard swap — reaches the UI.
const HAND_COMPLETE_TRICK_CLEAR_MS = 220;
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
    const endsHand = stepped.state.phase === "hand-complete";
    // A trick that ends the hand flips `phase` to "hand-complete" in the very same step that
    // completes it — reporting that real phase here would switch the screen straight to the
    // scoreboard before the delay below even starts, so the human never actually sees the last
    // trick land. Report the phase as it was *before* this play instead (always "playing" — only
    // PLAY_CARD can complete a trick, and only phase "playing" allows one) so the table keeps
    // rendering normally, showing `justCompleted` as the current trick, for the full reveal pause.
    // The real `stepped.state` (with its real phase) only reaches the UI once that pause — and,
    // if this trick ends the hand, the extra HAND_COMPLETE_TRICK_CLEAR_MS buffer below — elapses.
    onStep({ ...stepped.state, phase: current.phase }, stepped.biddingIndex, justCompleted.plays);
    if (botDelayMs > 0) {
      await delay(endsHand ? HAND_COMPLETE_REVEAL_MS : TRICK_REVEAL_MS);
      if (endsHand) {
        // Clear the table — still reporting "playing," so it stays mounted — and give the exit-
        // fade (Table.tsx's TrickSlot) time to actually play before the next call below reports
        // the real "hand-complete" phase and the screen swaps to the scoreboard entirely.
        onStep({ ...stepped.state, phase: current.phase }, stepped.biddingIndex, stepped.state.currentTrick);
        await delay(HAND_COMPLETE_TRICK_CLEAR_MS);
      }
    }
  }
  onStep(stepped.state, stepped.biddingIndex, stepped.state.currentTrick);
  // This specific onStep (unlike the ones above) is never followed by a real delay when this play
  // didn't complete a trick — the caller (autoPlay) goes straight into computing the *next*
  // decision, which for "hard"/"expert" card play can be a long synchronous ISMCTS search. Without
  // this yield, that card never gets its own paint: the browser only gets a chance to render once
  // several decisions' worth of state changes have already piled up. See `yieldToBrowser`'s doc
  // comment.
  if (botDelayMs > 0) await yieldToBrowser();
  return stepped;
}

/**
 * Runs dealing and bot decisions until it's the human's turn, or nothing more can happen without
 * them — that includes "hand-complete" (`{kind: "advance"}`), which deliberately does *not*
 * auto-advance: the UI stops there to show the hand's results and waits for the human to
 * continue (`continueToNextHand`), same as it waits for any other human decision. Pauses before
 * each bot decision so its card is visibly "played," not just instantly present.
 */
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
    if (decision.kind === "done" || decision.kind === "advance") return;
    if (decision.kind === "deal") {
      current = dealStep(current, random);
      bi = 0;
      onStep(current, bi, current.currentTrick);
      continue;
    }
    if (decision.player === humanSeat) return;

    // A bot whose dealt hand has no face cards always takes the free redeal — there's no
    // downside to it — before doing whatever its normal decision at this point would be. The
    // human gets the equivalent choice as their own explicit button (see GameScreen), since
    // unlike a bot they might have a reason to keep a weak-looking hand.
    if (canRequestRedeal(current, decision.player)) {
      const redeal: GameAction = { type: "REQUEST_REDEAL", player: decision.player, deck: shuffle(createDeck(), random) };
      await pacedDecision(botDelayMs, () => redeal);
      const stepped = await applyStepWithReveal(current, bi, redeal, botDelayMs, onStep);
      current = stepped.state;
      bi = stepped.biddingIndex;
      continue;
    }

    const action = await pacedDecision(botDelayMs, () => botAction(current, decision, bot));
    const stepped = await applyStepWithReveal(current, bi, action, botDelayMs, onStep);
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
  /** Redeals the current positive hand — only ever a legal move when `canRequestRedeal(game,
   * humanSeat)` says so (see rules-engine): the human's dealt hand has zero face cards, and they
   * haven't played a card of it yet. The UI is responsible for only offering the button then. */
  requestRedeal: () => void;
  /** Acknowledges the just-completed hand's results and moves on to the next deal (or to
   * game-complete, if that was the 10th hand). */
  continueToNextHand: () => void;
  /** Resolves once any in-flight bot auto-play / trick-reveal pause has settled. The real UI
   * doesn't need this — it just reacts to state as it streams in — but tests driving a full game
   * programmatically need to know when it's safe to read state / dispatch the next move. */
  waitForIdle: () => Promise<void>;
}

/** The minimum state needed to build (or rebuild) a store: either a brand-new game via
 * `createGameStore`, or one resumed from a previously-saved in-progress session via
 * `resumeGameStore` — both funnel through the same `buildStore` so the orchestration (dispatch,
 * autoPlay kickoff, pacing) never has to know which one it's dealing with. Also exactly what
 * `../game/persistence.ts` needs to save/restore a session. */
export interface InitialGameState {
  game: GameState;
  humanSeat: PlayerIndex;
  difficulty: Difficulty;
  biddingIndex: number;
}

function buildStore(initial: InitialGameState, random: RandomSource, botDelayMs: number): GameStoreHook {
  const bot = makeBot(initial.difficulty, random);
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
      game: initial.game,
      humanSeat: initial.humanSeat,
      difficulty: initial.difficulty,
      biddingIndex: initial.biddingIndex,
      displayTrick: initial.game.currentTrick,
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
      requestRedeal: () =>
        dispatch({ type: "REQUEST_REDEAL", player: get().humanSeat, deck: shuffle(createDeck(), random) }),
      continueToNextHand: () => dispatch({ type: "ADVANCE_HAND" }),
      waitForIdle: () => pending,
    };
  });

  // Kick off dealing (+ any bot decisions before the first human turn) right away — for a resumed
  // game this just means "keep going if it happened to be a bot's turn," same code path either way.
  pending = autoPlay(
    store.getState().game,
    initial.humanSeat,
    bot,
    random,
    initial.biddingIndex,
    botDelayMs,
    (state, biddingIndex, displayTrick) => store.setState({ game: state, biddingIndex, displayTrick }),
  );

  return store;
}

/**
 * Builds a fresh game store. One instance per game session — the caller creates a new one via
 * `useState(() => createGameStore(options))` when starting a game, the same pattern already used
 * for `initI18n()` in this app.
 */
export function createGameStore(options: NewGameOptions): GameStoreHook {
  const random = options.random ?? Math.random;
  const botDelayMs = options.botDelayMs ?? DEFAULT_BOT_THINK_MS;
  const initial: InitialGameState = {
    game: createGame(options.ruleSet, options.firstDealer),
    humanSeat: options.humanSeat,
    difficulty: options.difficulty,
    biddingIndex: 0,
  };
  return buildStore(initial, random, botDelayMs);
}

export interface ResumeGameOptions {
  /** Injectable for reproducible tests; defaults to Math.random for real play. */
  random?: RandomSource;
  /** See `NewGameOptions.botDelayMs`. */
  botDelayMs?: number;
}

/**
 * Rebuilds a game store from a previously-saved in-progress session (see
 * `../game/persistence.ts`'s `loadSoloSession`) instead of dealing a fresh game — same
 * `GameStoreHook` shape either way, so the rest of the app never needs to know a game was resumed
 * rather than started.
 */
export function resumeGameStore(session: InitialGameState, options: ResumeGameOptions = {}): GameStoreHook {
  const random = options.random ?? Math.random;
  const botDelayMs = options.botDelayMs ?? DEFAULT_BOT_THINK_MS;
  return buildStore(session, random, botDelayMs);
}

export type GameStoreHook = UseBoundStore<StoreApi<GameStore>>;
