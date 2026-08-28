import type { Card, GameState, PlayerIndex, TrumpSuit } from "rules-engine";
import type { AuctionTurnState } from "../game/auctionOrder";

/**
 * Mirrors apps/server/src/rooms/roomView.ts's `ClientEnvelope` and apps/server/src/rooms/
 * messages.ts's `ClientActionMessage` — a small, deliberate duplication (see the Online
 * Multiplayer plan's "optional shared package" note) rather than a cross-app import, since
 * apps/mobile can't import from apps/server. Keep these two files in sync by hand.
 */
export interface ClientEnvelope {
  /** Redacted server-side — every seat except `mySeat` has an empty hand here. */
  game: GameState;
  /** Real per-seat card counts — use this for opponents' remaining-card display, never
   * `game.hands[seat].length` (that's 0 for every redacted seat). */
  handSizes: Record<PlayerIndex, number>;
  auctionTurn: AuctionTurnState;
  mySeat: PlayerIndex;
  seatLabels: Record<PlayerIndex, string>;
  seatConnected: Record<PlayerIndex, boolean>;
  roomCode: string;
  gameId: string;
}

export interface ActionErrorMessage {
  message: string;
}

/** What this client is allowed to ask for — no `player` field (the server derives that from the
 * connection) and no `deck` field (the server always shuffles its own). */
export type ClientActionMessage =
  | { type: "DECLARE_TRUMP"; trump: TrumpSuit; direction: "up" | "down"; backwards: boolean }
  | { type: "OPEN_AUCTION" }
  | { type: "SUBMIT_BID"; tricks: number }
  | { type: "PASS_BID" }
  | { type: "DEALER_DECIDE"; sell: boolean }
  | { type: "PLAY_CARD"; card: Card }
  | { type: "REQUEST_REDEAL" }
  | { type: "ADVANCE_HAND" };
