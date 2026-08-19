import {
  applyAction,
  Card,
  createDeck,
  GameRules,
  GameState,
  highestBid,
  PlayerIndex,
  RandomSource,
  shuffle,
  SUITS,
  TrumpSuit,
} from "rules-engine";
import type { Difficulty } from "./chooseCard";
import { chooseCardHeuristic } from "./heuristic";
import type { TrumpDeclaration } from "./trump";

const ALL_SEATS: PlayerIndex[] = [0, 1, 2, 3];

export interface TrumpCandidate {
  trump: TrumpSuit;
  direction: "up" | "down";
  backwards: boolean;
}

export interface EvaluatedTrumpCandidate extends TrumpCandidate {
  /** Average real per-hand score, across every simulation actually run for this candidate. */
  averageScore: number;
  simulations: number;
}

// A suit shorter than this is essentially never worth even *considering* as trump — spending
// simulation budget on a 0-2 card suit would just starve the plausible candidates of samples for
// no realistic payoff. Deliberately not the old MIN_TRUMP_SUIT_LENGTH=4 "declare" threshold from
// trump.ts (which decided the *answer*, not what's worth evaluating) — this is only a floor on
// what gets a simulation slot at all; whether a merely-3-long suit is actually worth declaring is
// exactly what the simulated averages below decide, not a hardcoded rule. See
// .claude/skills/king-ai-opponent.
const MIN_HELD_TO_CONSIDER_TRUMP = 3;

/**
 * Every real trump/direction/backwards declaration this hand could make, given the game's rule
 * toggles — no-trump, plus each suit held at least `MIN_HELD_TO_CONSIDER_TRUMP` times, crossed with
 * "up" (always) / "down" (only if `ruleSet.playingDownEnabled`) and not-backwards (always) /
 * backwards (only if `ruleSet.backwardsEnabled`). No-trump/up/not-backwards is always candidate 0 —
 * it's always legal regardless of rule toggles, so it's the safe universal fallback if a budget so
 * small no simulation completes at all leaves every candidate with zero samples (see
 * `bestTrumpCandidate`).
 */
export function trumpCandidates(hand: Card[], ruleSet: GameRules): TrumpCandidate[] {
  const suitLengths: Record<string, number> = { S: 0, H: 0, D: 0, C: 0 };
  for (const card of hand) suitLengths[card.suit] += 1;

  const trumps: TrumpSuit[] = [null, ...SUITS.filter((s) => suitLengths[s] >= MIN_HELD_TO_CONSIDER_TRUMP)];
  const directions: ("up" | "down")[] = ruleSet.playingDownEnabled ? ["up", "down"] : ["up"];
  const backwardsOptions: boolean[] = ruleSet.backwardsEnabled ? [false, true] : [false];

  const candidates: TrumpCandidate[] = [];
  for (const trump of trumps) {
    for (const direction of directions) {
      for (const backwards of backwardsOptions) {
        candidates.push({ trump, direction, backwards });
      }
    }
  }
  return candidates;
}

/**
 * Plays out one full simulated hand: `player` (holding their real, actual `hand`) declares
 * `candidate` directly (no auction), the other three seats are dealt a uniformly random split of
 * every other unseen card — there's no void/tracking information to do better than uniform with,
 * since this decision happens before a single card of the hand has been played — and all four
 * seats play the entire hand out via `chooseCardHeuristic` (tracking on, the strongest non-search
 * policy, same choice `ismcts.ts`'s own rollouts make). Returns `player`'s real final score for
 * that one simulated hand, read directly off `handHistory` so trick resolution and scoring are
 * never reimplemented.
 *
 * Deliberately models a *direct* declaration (`positiveSetup.auction` stays `null` throughout,
 * never an auction-transfer) even when this is being used to evaluate a bidder's prospects, not a
 * dealer's — see `impliedTricks`'s own doc comment for why that's the right model here rather than
 * something this function should try to fix.
 */
function simulateOnce(
  hand: Card[],
  player: PlayerIndex,
  dealer: PlayerIndex,
  ruleSet: GameRules,
  candidate: TrumpCandidate,
  random: RandomSource,
): number {
  const mine = new Set(hand.map((c) => `${c.suit}${c.rank}`));
  const unseen = shuffle(
    createDeck().filter((c) => !mine.has(`${c.suit}${c.rank}`)),
    random,
  );
  const others = ALL_SEATS.filter((seat) => seat !== player);
  const hands: Record<PlayerIndex, Card[]> = { 0: [], 1: [], 2: [], 3: [] };
  hands[player] = hand;
  others.forEach((seat, i) => {
    hands[seat] = unseen.slice(i * 13, (i + 1) * 13);
  });

  let state: GameState = {
    ruleSet,
    firstDealer: dealer,
    handIndex: 6, // any index where HAND_SEQUENCE[handIndex] === "positive" — nothing here reads it beyond the handType set explicitly below
    handType: "positive",
    dealer,
    phase: "trump-selection",
    hands,
    completedTricks: [],
    currentTrick: [],
    currentTurn: dealer,
    positiveSetup: {
      trumpNamer: player,
      trump: null,
      direction: "up",
      backwards: false,
      auctionOpened: false,
      bids: [],
      auction: null,
    },
    cumulativeScores: { 0: 0, 1: 0, 2: 0, 3: 0 },
    handHistory: [],
  };

  state = applyAction(state, {
    type: "DECLARE_TRUMP",
    player,
    trump: candidate.trump,
    direction: candidate.direction,
    backwards: candidate.backwards,
  });

  while (state.phase === "playing") {
    const mover = state.currentTurn;
    const card = chooseCardHeuristic(state, mover, true);
    state = applyAction(state, { type: "PLAY_CARD", player: mover, card });
  }

  return state.handHistory[state.handHistory.length - 1].scores[player];
}

/**
 * Simulates repeated random deals for every candidate declaration `player`'s hand could make,
 * round-robin across candidates (one simulation per candidate per round) until `budgetMs` of
 * wall-clock time elapses — the same deadline-driven shape `ismcts.ts`'s own search loop uses, so
 * every candidate gets as close to an equal sample count as the budget allows rather than however
 * many happen to fall out of a fixed-iterations-per-candidate split. Returns the candidate with the
 * best observed average score; a budget too small for even one full round still returns a real,
 * always-legal answer (candidate 0 — no-trump/up/not-backwards) rather than nothing.
 *
 * This runs once per hand (at trump-declaration, at each bid, at the dealer's sell/keep decision),
 * not once per card the way `ismcts.ts`'s search does — see `HARD_TRUMP_BUDGET_MS`/
 * `EXPERT_TRUMP_BUDGET_MS` for why that budget can be considerably larger.
 */
export function bestTrumpCandidate(
  hand: Card[],
  player: PlayerIndex,
  dealer: PlayerIndex,
  ruleSet: GameRules,
  budgetMs: number,
  random: RandomSource,
): EvaluatedTrumpCandidate {
  const candidates = trumpCandidates(hand, ruleSet);
  const totals = candidates.map(() => 0);
  const counts = candidates.map(() => 0);
  const deadline = Date.now() + budgetMs;

  while (Date.now() < deadline) {
    for (let i = 0; i < candidates.length; i++) {
      totals[i] += simulateOnce(hand, player, dealer, ruleSet, candidates[i], random);
      counts[i] += 1;
      if (Date.now() >= deadline) break;
    }
  }

  let bestIndex = 0;
  let bestAverage = -Infinity;
  for (let i = 0; i < candidates.length; i++) {
    if (counts[i] === 0) continue;
    const average = totals[i] / counts[i];
    if (average > bestAverage) {
      bestAverage = average;
      bestIndex = i;
    }
  }
  return { ...candidates[bestIndex], averageScore: counts[bestIndex] > 0 ? bestAverage : 0, simulations: counts[bestIndex] };
}

/**
 * Converts a candidate's simulated average score back into an implied trick count, inverting
 * whichever payout curve `scorePositiveHandFromTricks` used for that candidate's direction ("up":
 * 25/trick; "down": 325 minus 75/trick, so a *higher* score means *fewer* tricks). This is what
 * lets `decideBid`/`decideSell`/`decideOpenAuction` stay in the same trick-count unit
 * `estimateTricks` already uses, so a search-based decision and a formula-based one elsewhere in
 * the same game are comparing like with like.
 *
 * Deliberately does *not* try to model the auction's bid-transfer scoring adjustment (a winning
 * bidder's tricks move from their own total to the dealer's at scoring time — see CLAUDE.md) —
 * `simulateOnce` always simulates a direct declaration. Modeling the transfer here would be
 * circular for `decideBid` specifically: the transfer amount is the bid itself, which is what this
 * function's result feeds into deciding. Treating the direct-declaration average as "how many
 * tricks this hand is worth to whoever names trump with it" and converting that to a bid the same
 * way a real player mentally estimates their hand, rather than re-deriving the bid from a
 * self-referential simulation, is the same kind of simplification `estimateTricks` itself already
 * makes (it doesn't simulate the transfer either).
 */
export function impliedTricks(candidate: TrumpCandidate, averageScore: number): number {
  return candidate.direction === "up" ? averageScore / 25 : (325 - averageScore) / 75;
}

// Below this implied-trick estimate, the dealer sells rather than naming trump themselves — same
// threshold value as `trump.ts`'s own (unexported, so independently declared here)
// `AUCTION_THRESHOLD`, just evaluated against a simulated rather than formula-based estimate.
const AUCTION_THRESHOLD_TRICKS = 3;

/**
 * The four once-per-hand decisions, as pure functions over an *already-evaluated* candidate (see
 * `bestTrumpCandidate`) — split out from the expensive simulation itself specifically so tests can
 * exercise real decision logic against a cheap, test-scoped search budget (mirroring how
 * `ismcts.test.ts`/`hardVsNormal.test.ts` call `ismctsChooseCard` directly with a tiny budget
 * instead of only ever going through production-budgeted `chooseCard`), without duplicating this
 * logic a second time in test code.
 */
export function decideTrumpDeclaration(best: EvaluatedTrumpCandidate): TrumpDeclaration {
  return { trump: best.trump, direction: best.direction, backwards: best.backwards };
}

export function decideOpenAuction(best: EvaluatedTrumpCandidate): boolean {
  return impliedTricks(best, best.averageScore) < AUCTION_THRESHOLD_TRICKS;
}

/** Bids the *floor* of the implied-tricks estimate rather than the nearest-rounded value — a
 * deliberately conservative rounding (never rounds an optimistic estimate up into a bid it doesn't
 * fully support), consistent with the real-table underbidding norms `estimateTricks` was itself
 * recalibrated toward (see .claude/skills/king-ai-opponent). */
export function decideBid(best: EvaluatedTrumpCandidate, currentHighBid: number): number | null {
  const estimate = Math.max(0, Math.floor(impliedTricks(best, best.averageScore)));
  return estimate > currentHighBid ? estimate : null;
}

export function decideSell(best: EvaluatedTrumpCandidate, topBidTricks: number | null): boolean {
  if (topBidTricks === null) return false;
  return topBidTricks > impliedTricks(best, best.averageScore);
}

/** Difícil's once-per-hand search budget. A modest step up from `HARD_BUDGET_MS` (per-card) — this
 * decision happens once a hand instead of once a trick, so a real player would tolerate — and this
 * bot can afford — noticeably more thinking time here without the per-card jank `ismcts.ts`'s own
 * doc comment already flags. Tunable — see .claude/skills/king-ai-opponent. */
export const HARD_TRUMP_BUDGET_MS = 600;
/** Experto's once-per-hand search budget — deliberately in the low-seconds range, well beyond
 * `EXPERT_BUDGET_MS`'s 900ms per-card budget, for the same "once per hand, not once per card"
 * reason. Tunable — see .claude/skills/king-ai-opponent. */
export const EXPERT_TRUMP_BUDGET_MS = 2500;

function budgetFor(difficulty: Extract<Difficulty, "hard" | "expert">): number {
  return difficulty === "expert" ? EXPERT_TRUMP_BUDGET_MS : HARD_TRUMP_BUDGET_MS;
}

/** Search-backed trump declaration for Difícil/Experto — picks whichever candidate simulated the
 * best average real score for `trumpNamer`'s actual hand. `trump.ts`'s own `chooseTrumpDeclaration`
 * (the Tier 1 formula) is untouched and still what Easy/Normal use — see .claude/skills/
 * king-ai-opponent for why once-per-hand decisions get their own tier here. */
export function chooseTrumpDeclarationSearch(
  state: GameState,
  trumpNamer: PlayerIndex,
  difficulty: Extract<Difficulty, "hard" | "expert">,
  random: RandomSource = Math.random,
): TrumpDeclaration {
  const best = bestTrumpCandidate(
    state.hands[trumpNamer],
    trumpNamer,
    state.dealer,
    state.ruleSet,
    budgetFor(difficulty),
    random,
  );
  return decideTrumpDeclaration(best);
}

/** Search-backed version of `shouldOpenAuction` for Difícil/Experto. */
export function shouldOpenAuctionSearch(
  state: GameState,
  dealer: PlayerIndex,
  difficulty: Extract<Difficulty, "hard" | "expert">,
  random: RandomSource = Math.random,
): boolean {
  const best = bestTrumpCandidate(state.hands[dealer], dealer, dealer, state.ruleSet, budgetFor(difficulty), random);
  return decideOpenAuction(best);
}

/** Search-backed version of `chooseBid` for Difícil/Experto: simulate the bidder's own best
 * candidate as if they'd become trump-namer, then bid via `decideBid`. */
export function chooseBidSearch(
  state: GameState,
  bidder: PlayerIndex,
  difficulty: Extract<Difficulty, "hard" | "expert">,
  random: RandomSource = Math.random,
): number | null {
  const best = bestTrumpCandidate(state.hands[bidder], bidder, state.dealer, state.ruleSet, budgetFor(difficulty), random);
  const currentHigh = highestBid(state.positiveSetup?.bids ?? [])?.tricks ?? 0;
  return decideBid(best, currentHigh);
}

/** Search-backed version of `chooseDealerDecision` for Difícil/Experto: sell when the top bid
 * promises more tricks than the dealer's own best simulated candidate. */
export function chooseDealerDecisionSearch(
  state: GameState,
  dealer: PlayerIndex,
  difficulty: Extract<Difficulty, "hard" | "expert">,
  random: RandomSource = Math.random,
): boolean {
  const top = highestBid(state.positiveSetup?.bids ?? []);
  if (top === null) return false; // nothing to compare against — skip the simulation entirely
  const best = bestTrumpCandidate(state.hands[dealer], dealer, dealer, state.ruleSet, budgetFor(difficulty), random);
  return decideSell(best, top.tricks);
}
