import type { Card, TrumpSuit } from "rules-engine";

/**
 * What a client is allowed to *ask for* — deliberately narrower than rules-engine's `GameAction`:
 * no `player` field (the server always derives that from the sender's assigned seat, never trusts
 * a client-supplied one) and no `deck` field (the server always shuffles its own). `PASS_BID` has
 * no `GameAction` equivalent at all — same as Solo mode's store, a pass only ever moves the
 * server-owned `auctionTurn` (game/auctionOrder.ts) forward, it never touches `GameState`.
 */
export type ClientActionMessage =
  | { type: "DECLARE_TRUMP"; trump: TrumpSuit; direction: "up" | "down"; backwards: boolean }
  | { type: "OPEN_AUCTION" }
  | { type: "SUBMIT_BID"; tricks: number }
  | { type: "PASS_BID" }
  | { type: "DEALER_DECIDE"; sell: boolean }
  | { type: "PLAY_CARD"; card: Card }
  | { type: "REQUEST_REDEAL" }
  | { type: "ADVANCE_HAND" };

export interface ActionErrorMessage {
  message: string;
}
