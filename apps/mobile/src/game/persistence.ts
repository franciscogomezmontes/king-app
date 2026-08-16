import AsyncStorage from "@react-native-async-storage/async-storage";
import { InitialGameState } from "./store";

const STORAGE_KEY = "king:soloGame:v1";
const SOLO_SESSION_VERSION = 1 as const;

/** The slice of AsyncStorage's API this module actually uses — narrow enough that tests can pass
 * a small in-memory fake instead of the real native module. Mirrors scorekeeper/persistence.ts. */
export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface SoloGameSession extends InitialGameState {
  version: typeof SOLO_SESSION_VERSION;
}

/**
 * Loads a previously-saved in-progress Solo vs Computer session, if any — same pattern as
 * scorekeeper/persistence.ts's loadSession: never throws into the caller, a missing key,
 * malformed JSON, or a `version` from an older/incompatible shape all just resolve to `null` (no
 * session to resume) rather than crashing the app on startup.
 */
export async function loadSoloSession(storage: KeyValueStorage = AsyncStorage): Promise<SoloGameSession | null> {
  try {
    const raw = await storage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const parsed = JSON.parse(raw) as Partial<SoloGameSession>;
    if (parsed.version !== SOLO_SESSION_VERSION) return null;
    return parsed as SoloGameSession;
  } catch {
    return null;
  }
}

/** Called on every state change while a game is in progress — see GameScreen.tsx's `GameTable`. */
export async function saveSoloSession(
  session: InitialGameState,
  storage: KeyValueStorage = AsyncStorage,
): Promise<void> {
  const full: SoloGameSession = { version: SOLO_SESSION_VERSION, ...session };
  await storage.setItem(STORAGE_KEY, JSON.stringify(full));
}

/** Called once a game finishes (it's no longer "in progress") or the player explicitly starts a
 * new game over a resumable one. */
export async function clearSoloSession(storage: KeyValueStorage = AsyncStorage): Promise<void> {
  await storage.removeItem(STORAGE_KEY);
}
