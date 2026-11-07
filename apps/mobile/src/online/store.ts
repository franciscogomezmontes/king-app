import { create, StoreApi, UseBoundStore } from "zustand";
import type { Room } from "colyseus.js";
import type { Card, GameRules } from "rules-engine";
import type { TrumpChoice } from "../game/store";
import { createOnlineRoom, joinOnlineRoomByCode, reconnectOnlineRoom } from "./connection";
import type { ActionErrorMessage, ClientActionMessage, ClientEnvelope } from "./types";

/** "reconnecting": an unconsented drop just happened (lost signal, backgrounded app) and an
 * automatic `client.reconnect()` attempt is in flight against the server's own grace window
 * (KingRoom.onLeave) — distinct from "connecting", which is the player's own first-time
 * host/join attempt. */
export type ConnectionStatus = "idle" | "connecting" | "connected" | "reconnecting" | "error";

/** The online counterpart to apps/mobile/src/game/store.ts's `GameStore` — same dispatch-method
 * *names* (playCard, declareTrump, submitBid, requestRedeal, continueToNextHand, ...) for
 * consistency, but each just sends a network message instead of calling `applyAction` locally.
 * `envelope` (not `game`) is the source of truth here — see `pendingDecision(envelope.game,
 * envelope.auctionTurn)`, reused verbatim from the Solo store, which is exactly why this store
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
  // The address this session actually connected with — kept around so an automatic reconnect
  // attempt (see attachRoom's onLeave handler) knows where to redial without the caller having to
  // pass it in again.
  let lastAddress = "";
  // Set right before *this app* initiates `room.leave()` (the player backed out to the menu) —
  // distinguishes that from an unconsented drop for the onLeave handler below, so an intentional
  // exit never triggers a pointless reconnect attempt, and a reconnect that resolves after the
  // player already left gets immediately abandoned instead of resurrecting a room they dismissed.
  let intentionalLeave = false;

  return create<OnlineGameStore>((set) => {
    function attachRoom(r: Room<unknown>) {
      room = r;
      intentionalLeave = false;
      r.onMessage("envelope", (message: ClientEnvelope) => {
        set({ envelope: message, status: "connected", lastError: null });
      });
      r.onMessage("action-error", (message: ActionErrorMessage) => {
        set({ lastError: message.message });
      });
      r.onLeave(() => {
        if (intentionalLeave) {
          room = null;
          set({ status: "idle" });
          return;
        }
        // Unconsented drop — the server is holding this seat open for a grace window
        // (KingRoom.onLeave's allowReconnection); try to resume the same session automatically
        // instead of dumping the player back to the lobby over what might be a momentary blip.
        set({ status: "reconnecting" });
        reconnectOnlineRoom(lastAddress, r.reconnectionToken)
          .then((resumed) => {
            if (intentionalLeave) {
              // The player left while the reconnect attempt was still in flight — don't
              // resurrect a room they already dismissed; clean it up server-side too.
              resumed.leave();
              return;
            }
            attachRoom(resumed);
            set({ status: "connected" });
          })
          .catch((err) => {
            room = null;
            set({ status: "error", lastError: err instanceof Error ? err.message : String(err), envelope: null });
          });
      });
    }

    function send(message: ClientActionMessage) {
      room?.send("action", message);
    }

    async function connect(address: string, connectFn: () => Promise<Room<unknown>>) {
      lastAddress = address;
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

      hostGame: (address, ruleSet, displayName) => connect(address, () => createOnlineRoom(address, ruleSet, displayName)),
      joinGame: (address, code, displayName) => connect(address, () => joinOnlineRoomByCode(address, code, displayName)),

      leaveGame: () => {
        intentionalLeave = true;
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
