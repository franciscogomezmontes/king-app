import { create, StoreApi, UseBoundStore } from "zustand";
import type { Room } from "colyseus.js";
import type { Card, GameRules } from "rules-engine";
import type { TrumpChoice } from "../game/store";
import { createOnlineRoom, joinOnlineRoomByCode } from "./connection";
import type { ActionErrorMessage, ClientActionMessage, ClientEnvelope } from "./types";

export type ConnectionStatus = "idle" | "connecting" | "connected" | "error";

/** The online counterpart to apps/mobile/src/game/store.ts's `GameStore` — same dispatch-method
 * *names* (playCard, declareTrump, submitBid, requestRedeal, continueToNextHand, ...) for
 * consistency, but each just sends a network message instead of calling `applyAction` locally.
 * `envelope` (not `game`) is the source of truth here — see `pendingDecision(envelope.game,
 * envelope.biddingIndex)`, reused verbatim from the Solo store, which is exactly why this store
 * doesn't need its own copy of that logic. There is no bot orchestration, no `waitForIdle`, and no
 * local `applyAction` — the server is authoritative, this store only reflects what it broadcasts. */
export interface OnlineGameStore {
  status: ConnectionStatus;
  envelope: ClientEnvelope | null;
  lastError: string | null;

  hostGame: (address: string, ruleSet: Partial<GameRules>, displayName: string) => Promise<void>;
  joinGame: (address: string, code: string, displayName: string) => Promise<void>;
  leaveGame: () => void;

  playCard: (card: Card) => void;
  declareTrump: (choice: TrumpChoice) => void;
  openAuction: () => void;
  submitBid: (tricks: number) => void;
  passBid: () => void;
  dealerDecide: (sell: boolean) => void;
  requestRedeal: () => void;
  continueToNextHand: () => void;
}

export type OnlineGameStoreHook = UseBoundStore<StoreApi<OnlineGameStore>>;

export function createOnlineGameStore(): OnlineGameStoreHook {
  let room: Room<unknown> | null = null;

  return create<OnlineGameStore>((set) => {
    function attachRoom(r: Room<unknown>) {
      room = r;
      r.onMessage("envelope", (message: ClientEnvelope) => {
        set({ envelope: message, status: "connected", lastError: null });
      });
      r.onMessage("action-error", (message: ActionErrorMessage) => {
        set({ lastError: message.message });
      });
      r.onLeave(() => {
        room = null;
        set({ status: "idle" });
      });
    }

    function send(message: ClientActionMessage) {
      room?.send("action", message);
    }

    async function connect(connectFn: () => Promise<Room<unknown>>) {
      set({ status: "connecting", lastError: null });
      try {
        const r = await connectFn();
        attachRoom(r);
        set({ status: "connected" });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        set({ status: "error", lastError: message });
        throw err;
      }
    }

    return {
      status: "idle",
      envelope: null,
      lastError: null,

      hostGame: (address, ruleSet, displayName) => connect(() => createOnlineRoom(address, ruleSet, displayName)),
      joinGame: (address, code, displayName) => connect(() => joinOnlineRoomByCode(address, code, displayName)),

      leaveGame: () => {
        room?.leave();
        room = null;
        set({ status: "idle", envelope: null, lastError: null });
      },

      playCard: (card) => send({ type: "PLAY_CARD", card }),
      declareTrump: (choice) =>
        send({ type: "DECLARE_TRUMP", trump: choice.trump, direction: choice.direction, backwards: choice.backwards }),
      openAuction: () => send({ type: "OPEN_AUCTION" }),
      submitBid: (tricks) => send({ type: "SUBMIT_BID", tricks }),
      passBid: () => send({ type: "PASS_BID" }),
      dealerDecide: (sell) => send({ type: "DEALER_DECIDE", sell }),
      requestRedeal: () => send({ type: "REQUEST_REDEAL" }),
      continueToNextHand: () => send({ type: "ADVANCE_HAND" }),
    };
  });
}
