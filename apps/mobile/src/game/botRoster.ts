import type { ImageSourcePropType } from "react-native";
import type { RandomSource } from "rules-engine";

export interface BotRosterEntry {
  name: string;
  /** An accent color for this character — not currently used for anything beyond identity
   * metadata, but every roster entry carries one so a future UI touch (e.g. a colored ring/tint)
   * doesn't need a second lookup table. */
  color: string;
  image: ImageSourcePropType;
}

/**
 * The 10 bot personas Solo vs Computer draws 3 opponents from (see `pickBotRosterIndices`) — art
 * generated once, reused across every game rather than per-game placeholder silhouettes. Which 3
 * archetypes/table personalities they represent is flavor text that lives in the UX plan doc, not
 * here; this module only needs to know each entry's name, image, and accent color.
 */
export const BOT_ROSTER: BotRosterEntry[] = [
  { name: "Marta", color: "#2f6f52", image: require("../../assets/avatars/marta.jpg") },
  { name: "Rafael", color: "#7a2f3d", image: require("../../assets/avatars/rafael.jpg") },
  { name: "Camila", color: "#c9a227", image: require("../../assets/avatars/camila.jpg") },
  { name: "Eduardo", color: "#c1633d", image: require("../../assets/avatars/eduardo.jpg") },
  { name: "Andrea", color: "#c48b93", image: require("../../assets/avatars/andrea.jpg") },
  { name: "Lucía", color: "#7d4a72", image: require("../../assets/avatars/lucia.jpg") },
  { name: "Rosario", color: "#7c7f3f", image: require("../../assets/avatars/rosario.jpg") },
  { name: "Iván", color: "#1f5f5b", image: require("../../assets/avatars/ivan.jpg") },
  { name: "Julián", color: "#a15239", image: require("../../assets/avatars/julian.jpg") },
  { name: "Santiago", color: "#c9862f", image: require("../../assets/avatars/santiago.jpg") },
];

/**
 * Picks `count` distinct indices into `BOT_ROSTER` — a partial Fisher-Yates shuffle, using the
 * same `RandomSource` already threaded through store.ts for deck shuffling (never `Math.random()`
 * directly), so bot identity is exercised by the same deterministic-with-a-seed pattern the rest
 * of game-state creation already relies on for tests.
 *
 * `excludeIndex` leaves one roster entry out of the draw entirely — the human player's own chosen
 * profile avatar (see profile/types.ts), if any, so a Solo game never happens to hand a bot the
 * exact same portrait the human is using for themselves that game. `null` (no profile avatar
 * chosen yet, or this call site doesn't care) draws from the full roster as before.
 */
export function pickBotRosterIndices(random: RandomSource, count: number, excludeIndex: number | null = null): number[] {
  const indices = BOT_ROSTER.map((_, i) => i).filter((i) => i !== excludeIndex);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, count);
}
