import { Client, Room } from "colyseus.js";
import type { GameRules } from "rules-engine";

/** What the player types is a bare "host:port" LAN address (e.g. "192.168.1.42:2567"), not a
 * full URL — this parses that into the pieces both the WS game connection and the plain HTTP
 * room-code lookup need. Accepts a scheme prefix too, in case someone pastes a full URL. */
function parseAddress(address: string): { host: string; port: number } {
  const trimmed = address
    .trim()
    .replace(/^wss?:\/\//i, "")
    .replace(/^https?:\/\//i, "");
  const [host, portText] = trimmed.split(":");
  const port = portText ? Number(portText) : 2567;
  return { host, port };
}

function wsUrl(address: string): string {
  const { host, port } = parseAddress(address);
  return `ws://${host}:${port}`;
}

function httpUrl(address: string): string {
  const { host, port } = parseAddress(address);
  return `http://${host}:${port}`;
}

/** Resolves a short room code (see apps/server/src/rooms/roomCodes.ts) to the real Colyseus
 * roomId a client can join — the one piece of this flow that isn't the standard colyseus.js SDK
 * call, since room codes are this app's own addition, not a Colyseus concept. */
export async function resolveRoomCode(address: string, code: string): Promise<string> {
  const res = await fetch(`${httpUrl(address)}/rooms/${encodeURIComponent(code.trim().toUpperCase())}`);
  if (!res.ok) {
    throw new Error(res.status === 404 ? "Room not found — check the code." : `Server error (${res.status}).`);
  }
  const data = (await res.json()) as { roomId: string };
  return data.roomId;
}

export async function createOnlineRoom(
  address: string,
  ruleSet: Partial<GameRules>,
  displayName: string,
): Promise<Room<unknown>> {
  const client = new Client(wsUrl(address));
  return client.create<unknown>("king_room", { ruleSet, displayName });
}

export async function joinOnlineRoomByCode(address: string, code: string, displayName: string): Promise<Room<unknown>> {
  const client = new Client(wsUrl(address));
  const roomId = await resolveRoomCode(address, code);
  return client.joinById<unknown>(roomId, { displayName });
}
