import type { PlayerIndex } from "rules-engine";

export type SeatPosition = "bottom" | "left" | "top" | "right";

const POSITIONS: SeatPosition[] = ["bottom", "left", "top", "right"];

/**
 * Where `seat` sits at the table relative to `humanSeat`, for a compass-style layout — the human
 * is always drawn at the bottom, with the other three seats arranged left/top/right in turn
 * order. This is the standard trick-taking card game table convention (Hearts, Spades, every King
 * implementation) — cards get shown near the seat that played them, not in a flat undifferentiated
 * row.
 */
export function seatPosition(seat: PlayerIndex, humanSeat: PlayerIndex): SeatPosition {
  const relative = (((seat - humanSeat) % 4) + 4) % 4;
  return POSITIONS[relative];
}
