import { DEFAULT_GAME_RULES, GameRules } from "rules-engine";
import type { CardBackStyle } from "ui-kit";

export interface Settings {
  /** Bumped only if this shape changes — a persisted settings blob with a stale version is
   * discarded in favor of the defaults, same defensive pattern as Scorekeeper's session. */
  version: 1;
  cardBackStyle: CardBackStyle;
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
  gameRules: DEFAULT_GAME_RULES,
  saveHistoryEnabled: true,
};
