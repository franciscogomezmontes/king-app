import AsyncStorage from "@react-native-async-storage/async-storage";
import type { KeyValueStorage } from "../scorekeeper/persistence";
import type { CompletedGame } from "./types";

const STORAGE_KEY = "king:history:v1";
const HISTORY_VERSION = 1;

interface StoredHistory {
  version: number;
  games: CompletedGame[];
}

/** Every completed game ever saved, newest first. Never throws — a missing key or malformed/stale
 * JSON just resolves to an empty list rather than crashing the History screen. */
export async function loadCompletedGames(storage: KeyValueStorage = AsyncStorage): Promise<CompletedGame[]> {
  try {
    const raw = await storage.getItem(STORAGE_KEY);
    if (raw === null) return [];
    const parsed = JSON.parse(raw) as Partial<StoredHistory>;
    if (parsed.version !== HISTORY_VERSION || !Array.isArray(parsed.games)) return [];
    return parsed.games;
  } catch {
    return [];
  }
}

/** Appends one finished game to the saved history. */
export async function saveCompletedGame(
  game: CompletedGame,
  storage: KeyValueStorage = AsyncStorage,
): Promise<void> {
  const existing = await loadCompletedGames(storage);
  const next: StoredHistory = { version: HISTORY_VERSION, games: [game, ...existing] };
  await storage.setItem(STORAGE_KEY, JSON.stringify(next));
}

/** Overwrites one previously saved game in place (matched by id) — used when a Scorekeeper hand
 * is edited after that game already finished and was saved. Silently no-ops if the id isn't found
 * (the record was cleared some other way), rather than resurrecting it. */
export async function updateCompletedGame(
  id: string,
  game: CompletedGame,
  storage: KeyValueStorage = AsyncStorage,
): Promise<void> {
  const existing = await loadCompletedGames(storage);
  const next: StoredHistory = { version: HISTORY_VERSION, games: existing.map((g) => (g.id === id ? game : g)) };
  await storage.setItem(STORAGE_KEY, JSON.stringify(next));
}
