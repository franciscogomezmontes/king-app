import type { PlayerIndex } from "rules-engine";
import type { ScoreboardEntry } from "ui-kit";

export type GameMode = "scorekeeper" | "solo";

/**
 * One finished game, regardless of which mode produced it — Scorekeeper (physical cards) and Solo
 * vs Computer both write to the same shape, so a single History screen can list and re-display
 * either. `handHistory` reuses ui-kit's own `ScoreboardEntry`, so a past game's full breakdown is
 * just `<Scoreboard handHistory={game.handHistory} .../>` again, no separate rendering path.
 */
export interface CompletedGame {
  id: string;
  mode: GameMode;
  /** YYYY-MM-DD — when the game was played (Scorekeeper: editable; Solo: the day it was finished). */
  date: string;
  /** ISO datetime — when this record was saved, for sorting newest-first. */
  savedAt: string;
  playerNames: Record<PlayerIndex, string>;
  finalScores: Record<PlayerIndex, number>;
  handHistory: ScoreboardEntry[];
}
