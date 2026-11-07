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

function emptyNames(): Record<PlayerIndex, string> {
  return { 0: "", 1: "", 2: "", 3: "" };
}

/** Today's date as YYYY-MM-DD, in the device's local timezone (not UTC — `toISOString` would
 * shift the date backwards for anyone west of UTC in the evening). */
export function todayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
  version: 2;
  /** Index into HAND_SEQUENCE; 10 once all hands are confirmed (game complete). */
  handIndex: number;
  draftCounts: Record<PlayerIndex, number>;
  draftDirection: "up" | "down";
  history: ScorekeeperEntry[];
  cumulativeScores: Record<PlayerIndex, number>;
  /** Empty string = not named yet; falls back to "Player N" wherever it's displayed. */
  playerNames: Record<PlayerIndex, string>;
  /** YYYY-MM-DD. Defaults to the day the game was started; editable in case a physical game
   * played earlier is being entered after the fact. */
  date: string;
}

export const SCOREKEEPER_STATE_VERSION = 2 as const;

export function createScorekeeperState(): ScorekeeperState {
  return {
    version: SCOREKEEPER_STATE_VERSION,
    handIndex: 0,
    draftCounts: zeroCounts(),
    draftDirection: "up",
    history: [],
    cumulativeScores: zeroCounts(),
    playerNames: emptyNames(),
    date: todayIsoDate(),
  };
}

export function setPlayerName(state: ScorekeeperState, player: PlayerIndex, name: string): ScorekeeperState {
  return { ...state, playerNames: { ...state.playerNames, [player]: name } };
}

export function setDate(state: ScorekeeperState, date: string): ScorekeeperState {
  return { ...state, date };
}

/** A name if one was given, else the generic fallback the caller supplies (usually a translated
 * "Player N"). */
export function displayName(state: ScorekeeperState, player: PlayerIndex, fallback: string): string {
  const custom = state.playerNames[player].trim();
  return custom.length > 0 ? custom : fallback;
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

/** Recomputes and replaces a previously confirmed hand's counts/direction/scores, then re-derives
 * cumulative totals from the full history — the "go back and fix a mistake" flow, since counts
 * entered wrong at the table don't always get caught before the next hand is confirmed. No-op if
 * `index` isn't a valid `history` index. */
export function editHand(
  state: ScorekeeperState,
  index: number,
  counts: Record<PlayerIndex, number>,
  direction: "up" | "down",
): ScorekeeperState {
  const existing = state.history[index];
  if (existing === undefined) return state;

  const scores =
    existing.handType === "positive"
      ? scorePositiveHandFromTricks(counts, direction)
      : scoreNegativeHandFromCounts(existing.handType, counts);

  const updated: ScorekeeperEntry = {
    handType: existing.handType,
    counts,
    direction: existing.handType === "positive" ? direction : null,
    scores,
  };

  const history = state.history.map((entry, i) => (i === index ? updated : entry));
  const cumulativeScores = zeroCounts();
  for (const entry of history) {
    for (const player of PLAYERS) cumulativeScores[player] += entry.scores[player];
  }

  return { ...state, history, cumulativeScores };
}
