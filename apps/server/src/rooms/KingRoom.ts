import { Client, Room } from "@colyseus/core";
import {
  applyAction,
  createDeck,
  DEFAULT_GAME_RULES,
  GameAction,
  GameRules,
  GameState,
  PlayerIndex,
  createGame,
  shuffle,
} from "rules-engine";
import { advanceAuctionTurn, AuctionTurnState, currentBidder, INITIAL_AUCTION_TURN } from "../game/auctionOrder";
import { ActionErrorMessage, ClientActionMessage } from "./messages";
import { registerRoomCode, unregisterRoomCode } from "./roomCodes";
import { toClientView } from "./roomView";

// Bookkeeping mirrors apps/mobile/src/game/store.ts's RESETS_AUCTION_TURN — kept in sync
// deliberately, not shared code, since these are two different runtimes (one local-authoritative,
// one network-authoritative) that happen to need identical bookkeeping.
const RESETS_AUCTION_TURN = new Set<GameAction["type"]>(["DEAL_HAND", "OPEN_AUCTION", "DEALER_DECIDE", "ADVANCE_HAND"]);

interface CreateOptions {
  ruleSet?: Partial<GameRules>;
}

interface JoinOptions {
  displayName?: string;
}

interface ClientUserData {
  seat: PlayerIndex;
}

function zeroSeatRecord<T>(value: T): Record<PlayerIndex, T> {
  return { 0: value, 1: value, 2: value, 3: value };
}

/**
 * The authoritative room for one 4-seat King game. Never trusts a client-supplied `player` or
 * `deck` — see `handleAction`. State is plain-JSON (no `@colyseus/schema`, see the plan's design
 * decision #1); every state change is broadcast as a per-client redacted `ClientEnvelope`
 * (`roomView.ts`), never one shared payload.
 */
export class KingRoom extends Room {
  maxClients = 4;

  private game!: GameState;
  private auctionTurn: AuctionTurnState = INITIAL_AUCTION_TURN;
  private seats: (string | null)[] = [null, null, null, null];
  private seatLabels: Record<PlayerIndex, string> = zeroSeatRecord("");
  private seatConnected: Record<PlayerIndex, boolean> = zeroSeatRecord(false);
  private roomCode = "";
  private gameId = "";

  onCreate(options: CreateOptions) {
    const ruleSet: GameRules = { ...DEFAULT_GAME_RULES, ...options.ruleSet };
    this.game = createGame(ruleSet, 0);
    this.roomCode = registerRoomCode(this.roomId);
    this.gameId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    this.onMessage("action", (client, message: ClientActionMessage) => this.handleAction(client, message));
  }

  onJoin(client: Client<ClientUserData>, options: JoinOptions) {
    const seat = this.seats.findIndex((s) => s === null);
    if (seat === -1) {
      throw new Error("Room is full");
    }
    const playerSeat = seat as PlayerIndex;
    this.seats[seat] = client.sessionId;
    this.seatLabels[playerSeat] = options.displayName?.trim() || `Player ${seat + 1}`;
    this.seatConnected[playerSeat] = true;
    client.userData = { seat: playerSeat };

    this.broadcastState();

    if (this.seats.every((s) => s !== null) && this.game.phase === "awaiting-deal") {
      this.dealHand();
      this.broadcastState();
    }
  }

  onLeave(client: Client<ClientUserData>) {
    const seat = client.userData?.seat;
    if (seat === undefined) return;
    this.seatConnected[seat] = false;
    this.broadcastState();
  }

  onDispose() {
    unregisterRoomCode(this.roomCode);
  }

  private dealHand() {
    const deck = shuffle(createDeck(), Math.random);
    this.game = applyAction(this.game, { type: "DEAL_HAND", deck });
    this.auctionTurn = INITIAL_AUCTION_TURN;
  }

  /** Throws if it isn't `seat`'s turn to act in the auction — rules-engine deliberately never
   * enforces this itself (only "bids must strictly increase"), so the server has to. */
  private checkBidTurn(seat: PlayerIndex, isDealerDecide: boolean) {
    const expected = currentBidder(this.game.dealer, this.game.positiveSetup?.bids ?? [], this.auctionTurn);
    if (isDealerDecide) {
      if (expected !== null || seat !== this.game.dealer) {
        throw new Error(`Seat ${seat} cannot decide the auction yet — bidding isn't finished.`);
      }
    } else if (expected !== seat) {
      throw new Error(`It is not seat ${seat}'s turn to bid.`);
    }
  }

  private buildAction(seat: PlayerIndex, message: Exclude<ClientActionMessage, { type: "PASS_BID" }>): GameAction {
    switch (message.type) {
      case "DECLARE_TRUMP":
        return {
          type: "DECLARE_TRUMP",
          player: seat,
          trump: message.trump,
          direction: message.direction,
          backwards: message.backwards,
        };
      case "OPEN_AUCTION":
        return { type: "OPEN_AUCTION", player: seat };
      case "SUBMIT_BID":
        return { type: "SUBMIT_BID", player: seat, tricks: message.tricks };
      case "DEALER_DECIDE":
        return { type: "DEALER_DECIDE", player: seat, sell: message.sell };
      case "PLAY_CARD":
        return { type: "PLAY_CARD", player: seat, card: message.card };
      case "REQUEST_REDEAL":
        // Never trust a client-supplied deck for a redeal any more than for the initial deal.
        return { type: "REQUEST_REDEAL", player: seat, deck: shuffle(createDeck(), Math.random) };
      case "ADVANCE_HAND":
        return { type: "ADVANCE_HAND" };
    }
  }

  private handleAction(client: Client<ClientUserData>, message: ClientActionMessage) {
    const seat = client.userData?.seat;
    if (seat === undefined) return;

    try {
      if (message.type === "PASS_BID") {
        this.checkBidTurn(seat, false);
        this.auctionTurn = advanceAuctionTurn(this.auctionTurn, seat, true);
        this.broadcastState();
        return;
      }

      if (message.type === "SUBMIT_BID") {
        this.checkBidTurn(seat, false);
      } else if (message.type === "DEALER_DECIDE") {
        this.checkBidTurn(seat, true);
      }

      const action = this.buildAction(seat, message);
      this.game = applyAction(this.game, action);

      if (RESETS_AUCTION_TURN.has(action.type)) this.auctionTurn = INITIAL_AUCTION_TURN;
      else if (action.type === "SUBMIT_BID") this.auctionTurn = advanceAuctionTurn(this.auctionTurn, seat, false);

      // Collapse "hand fully advanced" + "deal the next one" into a single broadcast, mirroring
      // Solo mode's autoPlay chaining a deal automatically once a hand is done.
      if (this.game.phase === "awaiting-deal") this.dealHand();

      this.broadcastState();
    } catch (err) {
      const errorMessage: ActionErrorMessage = { message: err instanceof Error ? err.message : String(err) };
      client.send("action-error", errorMessage);
    }
  }

  private broadcastState() {
    for (const client of this.clients) {
      const seat = (client as Client<ClientUserData>).userData?.seat;
      if (seat === undefined) continue;
      client.send(
        // Not "state" — that name collides with colyseus's own reserved schema-sync protocol
        // message, even though this room never uses @colyseus/schema at all.
        "envelope",
        toClientView(this.game, seat, this.auctionTurn, this.seatLabels, this.seatConnected, this.roomCode, this.gameId),
      );
    }
  }
}
