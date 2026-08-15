import AsyncStorage from "@react-native-async-storage/async-storage";
import type { KeyValueStorage } from "../scorekeeper/persistence";
import { DEFAULT_SETTINGS, Settings, SETTINGS_VERSION } from "./types";

const STORAGE_KEY = "king:settings:v1";

/** Loads the player's saved settings, if any. Never throws into the caller — a missing key,
 * malformed JSON, or a `version` from an older/incompatible shape all just resolve to the
 * defaults rather than crashing the app on startup. */
export async function loadSettings(storage: KeyValueStorage = AsyncStorage): Promise<Settings> {
  try {
    const raw = await storage.getItem(STORAGE_KEY);
    if (raw === null) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    if (parsed.version !== SETTINGS_VERSION) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Settings, storage: KeyValueStorage = AsyncStorage): Promise<void> {
  await storage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
