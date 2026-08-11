import { PlayerIndex } from "../types";

/**
 * Who deals hand `handIndex` (0-9), given who dealt hand 0. Not confirmed anywhere in the
 * digitized rules doc beyond "first dealer: deal face-up until someone gets K♥" — this default
 * assumes the standard convention for this game family (rotate one seat left every hand). Kept as
 * a call-time parameter, never stored in `GameState`, so it's a one-line change if wrong rather
 * than a control-flow rewrite.
 */
export type DealerRotation = (handIndex: number, firstDealer: PlayerIndex) => PlayerIndex;

export const rotateLeftEachHand: DealerRotation = (handIndex, firstDealer) =>
  ((firstDealer + handIndex) % 4) as PlayerIndex;

/**
 * Who leads a hand's first trick, given that hand's dealer. Not confirmed anywhere in the
 * digitized rules doc — this default assumes the standard convention (seat left of the dealer)
 * shared by this game's whole family (Hearts/Spades/Whist/Bridge). Every trick after the first is
 * led by the previous trick's winner instead — that part *is* confirmed, via `resolveTrick`.
 */
export type FirstLeaderRule = (dealer: PlayerIndex) => PlayerIndex;

export const seatAfterDealer: FirstLeaderRule = (dealer) => ((dealer + 1) % 4) as PlayerIndex;
