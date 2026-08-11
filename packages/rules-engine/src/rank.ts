import { Rank } from "./types";

/**
 * Rank value used for "beats"/"highest" comparisons, honoring the "Backwards" alternative rule
 * (2 high, Ace low for that hand). `16 - rank` is a monotonic-decreasing remap of the 2..14 rank
 * range back onto itself (16-2=14, 16-14=2), so it inverts strict ordering without a lookup
 * table. Shared by legality.ts (mandatory-killing "beat the highest" checks) and trick.ts
 * (trick-winner resolution) so both agree on what "higher" means for a given hand — that
 * agreement is exactly what mandatory killing depends on to be enforceable.
 */
export function rankValue(rank: Rank, backwards: boolean): number {
  return backwards ? 16 - rank : rank;
}
