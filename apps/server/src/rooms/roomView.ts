import type { GameState, PlayerIndex } from "rules-engine";

const ALL_SEATS: PlayerIndex[] = [0, 1, 2, 3];

/** Everything one connected client needs to render the game — a wrapper around `GameState`, never
 * a fork of it (CLAUDE.md principle 1: rules-engine's shape is the only source of truth). Room
 * code, seat↔name mapping, connection status, `biddingIndex`, and `gameId` all live here instead
 * of being smuggled into `GameState` itself. */
export interface ClientEnvelope {
  /** Redacted for everyone except `mySeat` — see `toClientView`. */
  game: GameState;
  /** Real per-seat card counts. Needed because a redacted hand's `.length` is no longer
   * meaningful once it's been replaced with `[]` — an opponent's remaining-card count is public
   * information (same as the physical game), just not their actual cards. */
  handSizes: Record<PlayerIndex, number>;
  /** Server-owned — a "pass" during bidding never touches `GameState` (rules-engine has no
   * concept of it), so each client can't derive this locally the way Solo mode's store does. */
  biddingIndex: number;
  mySeat: PlayerIndex;
  seatLabels: Record<PlayerIndex, string>;
  seatConnected: Record<PlayerIndex, boolean>;
  roomCode: string;
  gameId: string;
}

/** Builds the envelope for exactly one viewer — every other seat's hand is redacted to `[]`.
 * Cards already on the table (`currentTrick`/`completedTricks`/`handHistory`) are left untouched;
 * those are legitimately public once played, same as at a physical table. Call this once per
 * connected client on every state change; never broadcast one shared envelope to all four —
 * that would leak every hand to every client. */
export function toClientView(
  game: GameState,
  viewerSeat: PlayerIndex,
  biddingIndex: number,
  seatLabels: Record<PlayerIndex, string>,
  seatConnected: Record<PlayerIndex, boolean>,
  roomCode: string,
  gameId: string,
): ClientEnvelope {
  const handSizes = {} as Record<PlayerIndex, number>;
  for (const seat of ALL_SEATS) handSizes[seat] = game.hands[seat].length;

  const redactedHands = { ...game.hands };
  for (const seat of ALL_SEATS) {
    if (seat !== viewerSeat) redactedHands[seat] = [];
  }

  return {
    game: { ...game, hands: redactedHands },
    handSizes,
    biddingIndex,
    mySeat: viewerSeat,
    seatLabels: { ...seatLabels },
    seatConnected: { ...seatConnected },
    roomCode,
    gameId,
  };
}
