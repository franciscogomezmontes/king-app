import { applyAction, Card, createDeck, GameState, legalCardsFor, PlayerIndex, RandomSource, shuffle, Suit } from "rules-engine";
import { CardTracker, nonDominatedLeads, trackCards } from "./cardTracker";
import { chooseCardHeuristic } from "./heuristic";

const ALL_SEATS: PlayerIndex[] = [0, 1, 2, 3];

function cardKey(card: Card): string {
  return `${card.suit}${card.rank}`;
}

// A determinization attempt can fail (a most-constrained-first ordering can still occasionally
// paint itself into a corner at 4 players). Retried a handful of times with a fresh shuffle before
// falling back to ignoring void constraints entirely on the last attempt — always returns *some*
// valid-count deal rather than throwing, since a slightly-wrong determinization is far better than
// a bot that crashes mid-game.
const MAX_DETERMINIZE_ATTEMPTS = 20;

/**
 * Samples one plausible full deal of every card `player` can't already see — their own hand plus
 * every card played so far are known; everything else (the other three players' actual hands) is
 * unknown and gets redistributed here, using only PUBLIC information: each opponent's known suit
 * voids (`tracker.voidSuits`, inferred purely from not following a led suit) and remaining card
 * count (`state.hands[opponent].length` — always public at a real table, just not *which* cards).
 * Deliberately never reads the actual contents of another player's hand; that would be looking at
 * hidden information, exactly what determinization exists to avoid.
 *
 * Deals "most-constrained-first": cards of a suit already voided by more opponents are placed
 * before less-constrained ones, since they have fewer legal homes and are the most likely to cause
 * a dead end later in the pass.
 */
export function determinizeHands(
  state: GameState,
  player: PlayerIndex,
  random: RandomSource,
): Record<PlayerIndex, Card[]> {
  const tracker = trackCards(state);
  const ownHand = state.hands[player];
  const ownKeys = new Set(ownHand.map(cardKey));
  const unseen = createDeck().filter((c) => !tracker.playedCards.has(cardKey(c)) && !ownKeys.has(cardKey(c)));

  const opponents = ALL_SEATS.filter((seat) => seat !== player);
  const targetCounts: Partial<Record<PlayerIndex, number>> = {};
  for (const seat of opponents) targetCounts[seat] = state.hands[seat].length;

  for (let attempt = 0; attempt < MAX_DETERMINIZE_ATTEMPTS; attempt++) {
    const relaxVoids = attempt === MAX_DETERMINIZE_ATTEMPTS - 1;
    const dealt = tryDeal(unseen, opponents, targetCounts as Record<PlayerIndex, number>, tracker, random, relaxVoids);
    if (dealt !== null) {
      dealt[player] = ownHand;
      return dealt;
    }
  }
  // Unreachable: the final attempt relaxes void constraints entirely, leaving only the count
  // constraint, which is always satisfiable (unseen.length always equals the sum of the targets).
  throw new Error("determinizeHands: could not construct a valid deal");
}

function tryDeal(
  unseen: Card[],
  opponents: PlayerIndex[],
  targetCounts: Record<PlayerIndex, number>,
  tracker: CardTracker,
  random: RandomSource,
  relaxVoids: boolean,
): Record<PlayerIndex, Card[]> | null {
  const voidCount = (suit: Suit) => opponents.filter((seat) => tracker.voidSuits[seat].has(suit)).length;
  const ordered = [...shuffle(unseen, random)].sort((a, b) => voidCount(b.suit) - voidCount(a.suit));

  const hands: Record<PlayerIndex, Card[]> = { 0: [], 1: [], 2: [], 3: [] };
  const remaining: Record<PlayerIndex, number> = { ...targetCounts };

  for (const card of ordered) {
    const eligible = opponents.filter(
      (seat) => remaining[seat] > 0 && (relaxVoids || !tracker.voidSuits[seat].has(card.suit)),
    );
    if (eligible.length === 0) return null;
    const pick = eligible[Math.floor(random() * eligible.length)];
    hands[pick].push(card);
    remaining[pick] -= 1;
  }
  return hands;
}

/** One node in the shared ISMCTS tree — an information set (a point in the play sequence reached
 * by a specific sequence of card choices from the root), not a single game state. `availability`
 * (distinct from `visits`) is ISMCTS's own correction to plain UCB1: an action isn't a candidate
 * for selection in every determinization (it might not be legal in a given sampled world), so the
 * exploration term needs "how many times was this action even legal here" rather than "how many
 * times was the parent visited." */
interface TreeNode {
  children: Map<string, TreeNode>;
  visits: number;
  totalReward: number;
  availability: number;
}

function newNode(): TreeNode {
  return { children: new Map(), visits: 0, totalReward: 0, availability: 0 };
}

// UCB1's exploration/exploitation balance. Rewards are normalized to [0,1] per search (see
// `runIteration`) before this is applied, so — unlike the raw score deltas the game actually
// produces — this constant means the same thing regardless of hand type. The textbook sqrt(2) is
// calibrated for the general bounded-reward case and tends to over-explore for the modest,
// time-boxed budgets this bot runs under; 0.7 was chosen empirically as a reasonable
// exploration/exploitation balance for that regime. Tunable — see .claude/skills/king-ai-opponent.
const UCB1_EXPLORATION = 0.7;

function selectUcb1(node: TreeNode, legal: Card[], rewardMin: number, rewardMax: number): Card {
  const span = rewardMax - rewardMin;
  let best: Card | null = null;
  let bestScore = -Infinity;
  for (const card of legal) {
    const child = node.children.get(cardKey(card));
    if (child === undefined || child.visits === 0) continue; // only reachable if `legal` and `node.children` disagree — defensive, not expected
    const normalizedReward = span > 0 ? (child.totalReward / child.visits - rewardMin) / span : 0.5;
    const exploration = UCB1_EXPLORATION * Math.sqrt(Math.log(Math.max(child.availability, 1)) / child.visits);
    const score = normalizedReward + exploration;
    if (score > bestScore) {
      bestScore = score;
      best = card;
    }
  }
  return best!;
}

interface RewardRange {
  min: number;
  max: number;
}

/** One full ISMCTS iteration: a fresh determinization, then select/expand down the shared tree,
 * roll out the rest of the hand with Tier 1, and back-propagate the real score.
 *
 * `rootCandidates`, when non-null, restricts which actions are ever considered at the tree's
 * root node specifically (`node === root`, i.e. depth 0 of this iteration — the real decision
 * being searched, before any determinization-specific divergence) — see `ismctsChooseCard`'s own
 * doc comment for why: excluding self-evidently dominated negative-hand leads (a proven master,
 * guaranteed to win with no trump to ever beat it) before the search spends any of its modest
 * budget on them, rather than trusting the budget to statistically discover what's already a known
 * domain fact. Every deeper node (any other decision point reached later in a rollout/traversal,
 * including this same player leading again in a later trick) is unaffected — full `legalCardsFor`
 * as always. */
function runIteration(
  root: TreeNode,
  state: GameState,
  player: PlayerIndex,
  random: RandomSource,
  rewardRange: RewardRange,
  rootCandidates: Card[] | null,
): void {
  const deal = determinizeHands(state, player, random);
  let current: GameState = { ...state, hands: deal };
  let node = root;
  const path: TreeNode[] = [root];

  // Select + expand.
  while (current.phase === "playing") {
    const mover = current.currentTurn;
    const legal = node === root && rootCandidates !== null ? rootCandidates : legalCardsFor(current, mover);

    for (const card of legal) {
      const child = node.children.get(cardKey(card));
      if (child !== undefined) child.availability += 1;
    }

    const untried = legal.filter((c) => !node.children.has(cardKey(c)));
    if (untried.length > 0) {
      const chosen = untried[Math.floor(random() * untried.length)];
      const child = newNode();
      child.availability = 1;
      node.children.set(cardKey(chosen), child);
      current = applyAction(current, { type: "PLAY_CARD", player: mover, card: chosen });
      node = child;
      path.push(node);
      break; // this determinization's new information ends here — roll out the rest with Tier 1
    }

    const chosen = selectUcb1(node, legal, rewardRange.min, rewardRange.max);
    current = applyAction(current, { type: "PLAY_CARD", player: mover, card: chosen });
    node = node.children.get(cardKey(chosen))!;
    path.push(node);
  }

  // Roll out with Tier 1 (tracking on — the strongest non-search policy, not a second, weaker one
  // written just for this) for every seat until the hand ends.
  while (current.phase === "playing") {
    const mover = current.currentTurn;
    current = applyAction(current, { type: "PLAY_CARD", player: mover, card: chooseCardHeuristic(current, mover, true) });
  }

  const reward = current.handHistory[current.handHistory.length - 1].scores[player];
  rewardRange.min = Math.min(rewardRange.min, reward);
  rewardRange.max = Math.max(rewardRange.max, reward);
  for (const n of path) {
    n.visits += 1;
    n.totalReward += reward;
  }
}

/** Difícil's search budget: a modest allowance targeting a still-responsive ~150-300ms per
 * decision on a mid-range phone. Tunable — see .claude/skills/king-ai-opponent. */
export const HARD_BUDGET_MS = 250;
/** Experto's search budget: a deliberately larger allowance for a noticeably stronger (and
 * slower) opponent. Tunable — see .claude/skills/king-ai-opponent. */
export const EXPERT_BUDGET_MS = 900;

/**
 * Tier 2: Information Set Monte Carlo Tree Search — see .claude/skills/king-ai-opponent. Runs
 * iterations (fresh determinization -> select/expand down a shared tree -> Tier 1 rollout ->
 * back-propagate the real `scoreNegativeHand`/`scorePositiveHand` outcome, all via `applyAction`
 * so trick resolution and scoring are never reimplemented) until `budgetMs` of wall-clock time has
 * elapsed, then returns the root's legal move with the best average observed reward. Enforced with
 * a deadline check between iterations, not a fixed iteration count, so it degrades gracefully
 * under time pressure instead of janking the UI — including the extreme case of a budget so small
 * no iteration completes at all, where it falls back to the plain Tier 1 heuristic (always legal,
 * never "no answer") rather than an arbitrary or illegal pick.
 *
 * `budgetMs` is a parameter (not hardcoded to `HARD_BUDGET_MS`/`EXPERT_BUDGET_MS`) specifically so
 * tests can drive this with tiny/zero budgets without waiting on production-length searches.
 *
 * For a negative-hand lead specifically, the root's candidate set excludes self-evidently
 * dominated moves (`nonDominatedLeads` — a proven master card, guaranteed to win its own trick
 * with no trump in a negative hand to ever beat it) before the search even starts, rather than
 * relying on a modest time budget spread across a wide branching factor to statistically discover
 * what's already a known domain fact — see .claude/skills/king-ai-opponent and `runIteration`'s
 * own doc comment for exactly where this applies (root only, not every node in the tree).
 */
export function ismctsChooseCard(
  state: GameState,
  player: PlayerIndex,
  budgetMs: number,
  random: RandomSource = Math.random,
): Card {
  const rootLegal = legalCardsFor(state, player);
  if (rootLegal.length <= 1) return rootLegal[0];

  const rootCandidates: Card[] | null =
    state.handType !== "positive" && state.currentTrick.length === 0
      ? nonDominatedLeads(rootLegal, state.hands[player], trackCards(state))
      : null;
  if (rootCandidates !== null && rootCandidates.length === 1) return rootCandidates[0];

  const root = newNode();
  const rewardRange: RewardRange = { min: Infinity, max: -Infinity };
  const deadline = Date.now() + budgetMs;

  while (Date.now() < deadline) {
    runIteration(root, state, player, random, rewardRange, rootCandidates);
  }

  const searchSpace = rootCandidates ?? rootLegal;
  let bestCard: Card | null = null;
  let bestAverage = -Infinity;
  for (const card of searchSpace) {
    const child = root.children.get(cardKey(card));
    if (child === undefined || child.visits === 0) continue;
    const average = child.totalReward / child.visits;
    if (average > bestAverage) {
      bestAverage = average;
      bestCard = card;
    }
  }
  return bestCard ?? chooseCardHeuristic(state, player, true);
}
