import AsyncStorage from "@react-native-async-storage/async-storage";
import type { KeyValueStorage } from "../scorekeeper/persistence";
import { DEFAULT_PROFILE, Profile, PROFILE_VERSION } from "./types";

const STORAGE_KEY = "king:profile:v1";

/** Loads the player's saved profile, if any. Never throws into the caller — a missing key,
 * malformed JSON, or a `version` from an older/incompatible shape all just resolve to the
 * defaults rather than crashing the app on startup. */
export async function loadProfile(storage: KeyValueStorage = AsyncStorage): Promise<Profile> {
  try {
    const raw = await storage.getItem(STORAGE_KEY);
    if (raw === null) return DEFAULT_PROFILE;
    const parsed = JSON.parse(raw) as Partial<Profile>;
    if (parsed.version !== PROFILE_VERSION) return DEFAULT_PROFILE;
    return { ...DEFAULT_PROFILE, ...parsed };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export async function saveProfile(profile: Profile, storage: KeyValueStorage = AsyncStorage): Promise<void> {
  await storage.setItem(STORAGE_KEY, JSON.stringify(profile));
}
