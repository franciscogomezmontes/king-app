import AsyncStorage from "@react-native-async-storage/async-storage";
import type { KeyValueStorage } from "../scorekeeper/persistence";

const STORAGE_KEY = "king:online:serverAddress:v1";

interface StoredAddress {
  version: 1;
  address: string;
}

const VERSION = 1 as const;

/** No default of its own — `null` just means this device has never saved an address. The build's
 * own default (EXPO_PUBLIC_KING_SERVER_URL, see apps/mobile/.env.example) lives in the caller
 * (OnlineScreen.tsx's Lobby), not here, so this stays a pure "what did we persist" read. */
export async function loadServerAddress(storage: KeyValueStorage = AsyncStorage): Promise<string | null> {
  try {
    const raw = await storage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const parsed = JSON.parse(raw) as Partial<StoredAddress>;
    if (parsed.version !== VERSION || typeof parsed.address !== "string") return null;
    return parsed.address;
  } catch {
    return null;
  }
}

export async function saveServerAddress(address: string, storage: KeyValueStorage = AsyncStorage): Promise<void> {
  const stored: StoredAddress = { version: VERSION, address };
  await storage.setItem(STORAGE_KEY, JSON.stringify(stored));
}
