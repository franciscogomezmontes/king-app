import AsyncStorage from "@react-native-async-storage/async-storage";
import { SCOREKEEPER_STATE_VERSION, ScorekeeperState } from "./state";

const STORAGE_KEY = "king:scorekeeper:v1";

/** The slice of AsyncStorage's API this module actually uses — narrow enough that tests can pass
 * a small in-memory fake instead of the real native module. */
export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/**
 * Loads a previously-saved Scorekeeper session, if any. Never throws into the caller — a missing
 * key, malformed JSON, or a `version` from an older/incompatible shape all just resolve to `null`
 * (no session to resume) rather than crashing the app on startup.
 */
export async function loadSession(storage: KeyValueStorage = AsyncStorage): Promise<ScorekeeperState | null> {
  try {
    const raw = await storage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const parsed = JSON.parse(raw) as Partial<ScorekeeperState>;
    if (parsed.version !== SCOREKEEPER_STATE_VERSION) return null;
    return parsed as ScorekeeperState;
  } catch {
    return null;
  }
}

export async function saveSession(state: ScorekeeperState, storage: KeyValueStorage = AsyncStorage): Promise<void> {
  await storage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/** Called once a game finishes (it's no longer "in progress") or the player explicitly starts a
 * new game over a resumable one. */
export async function clearSession(storage: KeyValueStorage = AsyncStorage): Promise<void> {
  await storage.removeItem(STORAGE_KEY);
}
