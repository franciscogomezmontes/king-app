import type { Express, Request, Response } from "express";

// Excludes 0/O/1/I — easier to read aloud and type correctly on a phone keyboard than a full
// base36 alphabet.
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 5;

const codeToRoomId = new Map<string, string>();

function generateCode(): string {
  let code: string;
  do {
    code = Array.from({ length: CODE_LENGTH }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join(
      "",
    );
  } while (codeToRoomId.has(code));
  return code;
}

/** Called from `KingRoom.onCreate` — generates a short, host-shareable code and registers it
 * against the room's real (long, opaque) Colyseus `roomId`. */
export function registerRoomCode(roomId: string): string {
  const code = generateCode();
  codeToRoomId.set(code, roomId);
  return code;
}

/** Called from `KingRoom.onDispose` so a code never resolves to a room that no longer exists. */
export function unregisterRoomCode(code: string): void {
  codeToRoomId.delete(code);
}

export function resolveRoomCode(code: string): string | undefined {
  return codeToRoomId.get(code.toUpperCase());
}

/** The one REST route joining needs: resolve a human-typed code to the real `roomId` before
 * calling `client.joinById(roomId, ...)`. Room *creation* goes through colyseus.js's normal
 * `client.create("king_room", options)` — no custom route needed for that half. */
export function attachRoomCodeRoutes(app: Express): void {
  app.get("/rooms/:code", (req: Request, res: Response) => {
    const roomId = resolveRoomCode(req.params.code);
    if (roomId === undefined) {
      res.status(404).json({ error: "Room not found" });
      return;
    }
    res.json({ roomId });
  });
}
