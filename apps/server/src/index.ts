import http from "http";
import express from "express";
import { createGameServer } from "./gameServer";
import { attachRoomCodeRoutes } from "./rooms/roomCodes";

const app = express();
app.use(express.json());
// The mobile web client (Expo dev server, its own port) calls the room-code REST route
// cross-origin — without this, the browser blocks it with a CORS error before it ever reaches
// this server. LAN-only/no-auth for this slice, so a wide-open origin is fine here.
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});
attachRoomCodeRoutes(app);

const httpServer = http.createServer(app);
const gameServer = createGameServer(httpServer);

const port = Number(process.env.PORT) || 2567;

// Bind 0.0.0.0, not the "localhost" default — required for other devices on the same LAN to
// reach this server. This slice is LAN-only (no deployment), so getting this default wrong would
// silently break the whole point of testing across multiple phones/browsers.
gameServer.listen(port, "0.0.0.0").then(() => {
  console.log(`King server listening on ws://0.0.0.0:${port}`);
});
