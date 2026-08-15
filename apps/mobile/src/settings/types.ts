import type { CardBackStyle } from "ui-kit";

export interface Settings {
  /** Bumped only if this shape changes — a persisted settings blob with a stale version is
   * discarded in favor of the defaults, same defensive pattern as Scorekeeper's session. */
  version: 1;
  cardBackStyle: CardBackStyle;
}

export const SETTINGS_VERSION = 1 as const;

export const DEFAULT_SETTINGS: Settings = {
  version: SETTINGS_VERSION,
  cardBackStyle: "lattice",
};
