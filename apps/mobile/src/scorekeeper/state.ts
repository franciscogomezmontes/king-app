import {
  HAND_SEQUENCE,
  HandType,
  PlayerIndex,
  scoreNegativeHandFromCounts,
  scorePositiveHandFromTricks,
} from "rules-engine";

const PLAYERS: PlayerIndex[] = [0, 1, 2, 3];

function zeroCounts(): Record<PlayerIndex, number> {
  return { 0: 0, 1: 0, 2: 0, 3: 0 };
}

/** One confirmed hand's entry — keeps `counts` (not just `scores`) so a later "edit a past hand"
 * feature stays possible without redesigning this shape. */
export interface ScorekeeperEntry {
  handType: HandType;
  counts: Record<PlayerIndex, number>;
  /** null for negative hands, which have no direction choice. */
  direction: "up" | "down" | null;
  scores: Record<PlayerIndex, number>;
}

export interface ScorekeeperState {
  /** Bumped only if this shape changes — a persisted session with a stale version is discarded
   * rather than risking a crash on load. */
  version: 1;
  /** Index into HAND_SEQUENCE; 10 once all hands are confirmed (game complete). */
  handIndex: number;
  draftCounts: Record<PlayerIndex, number>;
  draftDirection: "up" | "down";
  history: ScorekeeperEntry[];
  cumulativeScores: Record<PlayerIndex, number>;
}

export const SCOREKEEPER_STATE_VERSION = 1 as const;

export function createScorekeeperState(): ScorekeeperState {
  return {
    version: SCOREKEEPER_STATE_VERSION,
    handIndex: 0,
    draftCounts: zeroCounts(),
    draftDirection: "up",
    history: [],
    cumulativeScores: zeroCounts(),
  };
}

export function isGameComplete(state: ScorekeeperState): boolean {
  return state.handIndex >= HAND_SEQUENCE.length;
}

export function currentHandType(state: ScorekeeperState): HandType | null {
  return isGameComplete(state) ? null : HAND_SEQUENCE[state.handIndex];
}

export function setCount(state: ScorekeeperState, player: PlayerIndex, value: number): ScorekeeperState {
  return { ...state, draftCounts: { ...state.draftCounts, [player]: value } };
}

export function setDirection(state: ScorekeeperState, direction: "up" | "down"): ScorekeeperState {
  return { ...state, draftDirection: direction };
}

/** Scores the hand currently being entered (via the same rules-engine functions Solo mode uses,
 * just fed counts instead of a play-by-play HandResult — see CLAUDE.md principle 1), appends it to
 * history, folds it into the running totals, and advances to the next hand. No-op if the game is
 * already complete. */
export function confirmHand(state: ScorekeeperState): ScorekeeperState {
  const handType = currentHandType(state);
  if (handType === null) return state;

  const scores =
    handType === "positive"
      ? scorePositiveHandFromTricks(state.draftCounts, state.draftDirection)
      : scoreNegativeHandFromCounts(handType, state.draftCounts);

  const entry: ScorekeeperEntry = {
    handType,
    counts: state.draftCounts,
    direction: handType === "positive" ? state.draftDirection : null,
    scores,
  };

  const cumulativeScores = { ...state.cumulativeScores };
  for (const player of PLAYERS) cumulativeScores[player] += scores[player];

  return {
    ...state,
    handIndex: state.handIndex + 1,
    draftCounts: zeroCounts(),
    draftDirection: "up",
    history: [...state.history, entry],
    cumulativeScores,
  };
}
