import type http from "http";
import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { KingRoom } from "./rooms/KingRoom";

/** Builds a configured but not-yet-listening `Server` — shared by `index.ts` (the real running
 * server, wired to an Express `http.Server` so REST room-code routes and the WS game connection
 * share one port) and the test suite (`@colyseus/testing`'s `boot()`, which calls `.listen()`
 * itself against a bare transport with no Express attached). */
export function createGameServer(httpServer?: http.Server): Server {
  const gameServer = new Server({
    transport: new WebSocketTransport(httpServer ? { server: httpServer } : {}),
  });
  gameServer.define("king_room", KingRoom);
  return gameServer;
}
