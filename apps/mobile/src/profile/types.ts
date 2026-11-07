export interface Profile {
  /** Bumped only if this shape changes — a persisted profile blob with a stale version is
   * discarded in favor of the defaults, same defensive pattern as Settings/Scorekeeper. */
  version: 1;
  /** The player's own display name, shown in place of the generic "You"/"Tú" label once set.
   * Empty string means "not set" — callers fall back to the generic label themselves rather than
   * this module inventing a placeholder name. */
  name: string;
  /** Index into `BOT_ROSTER` (apps/mobile/src/game/botRoster.ts) — the same 10-portrait gallery
   * bots draw their own identity from, reused here rather than a second art set. `null` means "no
   * avatar chosen yet" — callers fall back to Avatar's own placeholder silhouette. */
  avatarIndex: number | null;
}

export const PROFILE_VERSION = 1 as const;

export const DEFAULT_PROFILE: Profile = {
  version: PROFILE_VERSION,
  name: "",
  avatarIndex: null,
};
