import { DEFAULT_GAME_RULES, GameRules } from "rules-engine";
import type { CardBackStyle, FaceCardStyle } from "ui-kit";

export interface Settings {
  /** Bumped only if this shape changes — a persisted settings blob with a stale version is
   * discarded in favor of the defaults, same defensive pattern as Scorekeeper's session. */
  version: 1;
  cardBackStyle: CardBackStyle;
  /** Which illustrated deck draws King/Queen/Jack/Ace art (and the shared number-card
   * background) — see PlayingCard.tsx's `FaceCardStyle`. */
  faceCardStyle: FaceCardStyle;
  /** The game-setup rules menu (CLAUDE.md principle 3) — configured once here rather than
   * re-asked per game, and applied to every new Solo vs Computer game (also the starting point
   * an Online host's create-room form prefills from, since they can still adjust it per room).
   * Every field is a plain boolean today, so a future rules-engine toggle just needs a
   * `GAME_RULE_TOGGLE_KEYS` entry (ui-kit) to show up here automatically — see
   * SettingsScreen.tsx. */
  gameRules: GameRules;
  /** Whether finishing a game (any mode) saves it into the shared cross-mode history store. On by
   * default — this only controls future saves, never retroactively deletes anything already
   * saved (that's the History screen's own per-game/clear-all delete instead). */
  saveHistoryEnabled: boolean;
  /** Whether the live table shows the running-score progress bars (ScorePanel's ScoreProgress)
   * above the felt. Off by default (per Francisco's request) — most players don't need it visible
   * every hand, and hiding it by default reclaims real vertical space on a phone screen; a player
   * who wants it can turn it back on here. */
  showScoreSummary: boolean;
}

export const SETTINGS_VERSION = 1 as const;

export const DEFAULT_SETTINGS: Settings = {
  version: SETTINGS_VERSION,
  // First-run default (per Francisco's request) — a player who's never opened Settings still sees
  // a deliberately-chosen card back, not just whichever variant happens to be listed first. Once
  // they pick a different one in Settings, that choice persists (setCardBackStyle/useSettings) and
  // this default is never consulted again for them. Was "kMonogram" before that variant's rename
  // to "laurel" (see CardBack.tsx) — same art, same intent, just following the rename.
  cardBackStyle: "laurel",
  // "artdeco" (see PlayingCard.tsx's own doc comment) reads most clearly at this app's actual
  // 72x104px table size among the four styles — a judgment call, not a decision Francisco made
  // explicitly; a one-line change here if he'd rather default to a different style.
  faceCardStyle: "artdeco",
  gameRules: DEFAULT_GAME_RULES,
  saveHistoryEnabled: true,
  showScoreSummary: false,
};
