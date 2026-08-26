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
import { advanceAuctionTurn, AuctionTurnState, currentBidder, INITIAL_AUCTION_TURN } from "./auctionOrder";
import { pickBotRosterIndices } from "./botRoster";
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
  // "normal" keeps ai-opponent's Tier 1 formula-based bidding/trump/dealer-decision logic
  // (estimateTricks + trump.ts/auction.ts) untouched, same as it always has.
  if (difficulty === "normal") {
    return {
      chooseCard: (s, p) => aiOpponent.chooseCard(s, p, "normal", random),
      shouldOpenAuction: aiOpponent.shouldOpenAuction,
      chooseTrumpDeclaration: aiOpponent.chooseTrumpDeclaration,
      chooseBid: aiOpponent.chooseBid,
      chooseDealerDecision: aiOpponent.chooseDealerDecision,
    };
  }
  // "hard"/"expert": card play already used real ISMCTS search (chooseCard's own dispatch). The
  // once-per-hand decisions — trump declaration, bidding, the dealer's sell/keep call, whether to
  // open the auction at all — used to fall through to the exact same Tier 1 formula "normal" uses,
  // which is why Experto never felt meaningfully stronger than Normal outside individual tricks:
  // round-1 fixes only changed how a bot uses trump once it's already been named, not which trump
  // gets named or how much gets bid. `ai-opponent`'s `*Search` functions (trumpSearch.ts, Tier
  // 2.5 — see .claude/skills/king-ai-opponent) replay entire simulated hands to answer those
  // questions empirically instead, at each difficulty's own budget.
  return {
    chooseCard: (s, p) => aiOpponent.chooseCard(s, p, difficulty, random),
    shouldOpenAuction: (s, p) => aiOpponent.shouldOpenAuctionSearch(s, p, difficulty, random),
    chooseTrumpDeclaration: (s, p) => aiOpponent.chooseTrumpDeclarationSearch(s, p, difficulty, random),
    chooseBid: (s, p) => aiOpponent.chooseBidSearch(s, p, difficulty, random),
    chooseDealerDecision: (s, p) => aiOpponent.chooseDealerDecisionSearch(s, p, difficulty, random),
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

export function pendingDecision(state: GameState, auctionTurn: AuctionTurnState): PendingDecision {
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
      const bidder = currentBidder(state.dealer, state.positiveSetup!.bids, auctionTurn);
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

const RESETS_AUCTION_TURN = new Set<GameAction["type"]>([
  "DEAL_HAND",
  "OPEN_AUCTION",
  "DEALER_DECIDE",
  "ADVANCE_HAND",
  "REQUEST_REDEAL",
]);

/** Applies one decision's result (a real action, or a bid-decline "pass") and keeps auction-turn
 * bookkeeping in sync — the single place this logic lives, shared by bot and human moves alike. */
function applyDecisionResult(
  state: GameState,
  auctionTurn: AuctionTurnState,
  result: GameAction | "pass",
): { state: GameState; auctionTurn: AuctionTurnState } {
  if (result === "pass") {
    // A "pass" is only ever produced in response to a real "bid" decision (see botAction/passBid),
    // which only exists when currentBidder actually found someone to ask — so this is never null
    // in practice; the fallback just avoids silently mis-recording a pass no one asked for.
    const passer = currentBidder(state.dealer, state.positiveSetup!.bids, auctionTurn);
    return passer === null ? { state, auctionTurn } : { state, auctionTurn: advanceAuctionTurn(auctionTurn, passer, true) };
  }
  const nextState = applyAction(state, result);
  const nextTurn =
    result.type === "SUBMIT_BID"
      ? advanceAuctionTurn(auctionTurn, result.player, false)
      : RESETS_AUCTION_TURN.has(result.type)
        ? INITIAL_AUCTION_TURN
        : auctionTurn;
  return { state: nextState, auctionTurn: nextTurn };
}

function dealStep(state: GameState, random: RandomSource): GameState {
  return applyAction(state, { type: "DEAL_HAND", deck: shuffle(createDeck(), random) });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
// A just-played card's entrance animation (Table.tsx's TrickSlot, CARD_ENTER_MS=200ms) needs real,
// JS-thread-free wall-clock time to actually finish. Every difficulty except "expert" already gets
// this for free from pacedDecision's own pre-padding (its compute time is always under
// DEFAULT_BOT_THINK_MS, so a real setTimeout-based pause follows, during which the browser is
// completely free to run the animation) — "expert"'s 900ms ISMCTS budget always exceeds that
// floor, so pacedDecision pads nothing, and the very next bot's decision (same search, same 900ms
// synchronous block) would otherwise freeze this card's fade mid-flight for the whole block and
// "snap" it to fully visible the instant that block ends — reading as exactly the lag-then-sudden-
// jump this constant exists to prevent. A little over CARD_ENTER_MS for a small safety margin.
const CARD_ANIMATION_SETTLE_MS = 220;

type OnStep = (state: GameState, auctionTurn: AuctionTurnState, displayTrick: DisplayTrick) => void;

/**
 * Applies one action (or a bid "pass") and reports it to `onStep` — pausing first to reveal the
 * completed trick's 4 cards if this play just finished one, so "the table clears itself" never
 * happens in the same instant as "the last card lands." Shared by the human's own moves and every
 * bot decision, so both get identical pacing/visibility. `difficulty` only affects one thing: see
 * `CARD_ANIMATION_SETTLE_MS`.
 */
async function applyStepWithReveal(
  current: GameState,
  auctionTurn: AuctionTurnState,
  result: GameAction | "pass",
  botDelayMs: number,
  difficulty: Difficulty,
  onStep: OnStep,
): Promise<{ state: GameState; auctionTurn: AuctionTurnState }> {
  const tricksBefore = current.completedTricks.length;
  const stepped = applyDecisionResult(current, auctionTurn, result);

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
    onStep({ ...stepped.state, phase: current.phase }, stepped.auctionTurn, justCompleted.plays);
    if (botDelayMs > 0) {
      await delay(endsHand ? HAND_COMPLETE_REVEAL_MS : TRICK_REVEAL_MS);
      if (endsHand) {
        // Clear the table — still reporting "playing," so it stays mounted — and give the exit-
        // fade (Table.tsx's TrickSlot) time to actually play before the next call below reports
        // the real "hand-complete" phase and the screen swaps to the scoreboard entirely.
        onStep({ ...stepped.state, phase: current.phase }, stepped.auctionTurn, stepped.state.currentTrick);
        await delay(HAND_COMPLETE_TRICK_CLEAR_MS);
      }
    }
  }
  onStep(stepped.state, stepped.auctionTurn, stepped.state.currentTrick);
  // This specific onStep (unlike the ones above) is never followed by a real delay when this play
  // didn't complete a trick — the caller (autoPlay) goes straight into computing the *next*
  // decision. See CARD_ANIMATION_SETTLE_MS: only "expert" card plays need the full settle window;
  // everything else gets a trivial yield (still a real setTimeout, not just an already-resolved
  // awaited promise, which would never let the browser paint at all).
  if (botDelayMs > 0) {
    const needsSettle = difficulty === "expert" && result !== "pass" && result.type === "PLAY_CARD";
    await delay(needsSettle ? CARD_ANIMATION_SETTLE_MS : 0);
  }
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
  difficulty: Difficulty,
  random: RandomSource,
  auctionTurn: AuctionTurnState,
  botDelayMs: number,
  onStep: OnStep,
): Promise<void> {
  let current = state;
  let turn = auctionTurn;
  for (;;) {
    const decision = pendingDecision(current, turn);
    if (decision.kind === "done" || decision.kind === "advance") return;
    if (decision.kind === "deal") {
      current = dealStep(current, random);
      turn = INITIAL_AUCTION_TURN;
      onStep(current, turn, current.currentTrick);
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
      const stepped = await applyStepWithReveal(current, turn, redeal, botDelayMs, difficulty, onStep);
      current = stepped.state;
      turn = stepped.auctionTurn;
      continue;
    }

    const action = await pacedDecision(botDelayMs, () => botAction(current, decision, bot));
    const stepped = await applyStepWithReveal(current, turn, action, botDelayMs, difficulty, onStep);
    current = stepped.state;
    turn = stepped.auctionTurn;
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
  /** The human player's own chosen profile avatar (profile/types.ts's `avatarIndex`), if any — kept
   * out of this game's bot roster draw so the human never shares a portrait with one of their own
   * opponents that game. `undefined`/`null` draws from the full roster, same as before profiles
   * existed. */
  excludeAvatarIndex?: number | null;
}

export interface GameStore {
  game: GameState;
  humanSeat: PlayerIndex;
  difficulty: Difficulty;
  /** Which 3 `BOT_ROSTER` (botRoster.ts) entries are seats 1/2/3 for this game, in seat order —
   * chosen once at creation (see `createGameStore`) and carried through resume, never reassigned
   * mid-game. */
  botRosterIndices: number[];
  auctionTurn: AuctionTurnState;
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
  /** See `GameStore.botRosterIndices`. */
  botRosterIndices: number[];
  auctionTurn: AuctionTurnState;
}

function buildStore(initial: InitialGameState, random: RandomSource, botDelayMs: number): GameStoreHook {
  const bot = makeBot(initial.difficulty, random);
  let pending: Promise<void> = Promise.resolve();

  const store = create<GameStore>((set, get) => {
    function onStep(state: GameState, auctionTurn: AuctionTurnState, displayTrick: DisplayTrick) {
      set({ game: state, auctionTurn, displayTrick });
    }

    async function runStep(result: GameAction | "pass") {
      const { game, auctionTurn, humanSeat } = get();
      // No pre-delay for the human's own move — they already deliberated by tapping — but a
      // trick they complete still gets the same reveal pause as anyone else's.
      const afterHuman = await applyStepWithReveal(game, auctionTurn, result, botDelayMs, initial.difficulty, onStep);
      await autoPlay(afterHuman.state, humanSeat, bot, initial.difficulty, random, afterHuman.auctionTurn, botDelayMs, onStep);
    }

    function dispatch(result: GameAction | "pass") {
      pending = runStep(result);
    }

    return {
      game: initial.game,
      humanSeat: initial.humanSeat,
      difficulty: initial.difficulty,
      botRosterIndices: initial.botRosterIndices,
      auctionTurn: initial.auctionTurn,
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
    initial.difficulty,
    random,
    initial.auctionTurn,
    botDelayMs,
    (state, auctionTurn, displayTrick) => store.setState({ game: state, auctionTurn, displayTrick }),
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
    // Drawn from the same RandomSource as everything else here, not Math.random() directly — so a
    // seeded test gets the same 3 bots every time, same as it gets the same deals.
    botRosterIndices: pickBotRosterIndices(random, 3, options.excludeAvatarIndex ?? null),
    auctionTurn: INITIAL_AUCTION_TURN,
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
