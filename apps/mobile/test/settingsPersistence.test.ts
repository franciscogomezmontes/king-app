import { describe, expect, it } from "vitest";
import { KeyValueStorage } from "../src/scorekeeper/persistence";
import { loadSettings, saveSettings } from "../src/settings/persistence";
import { DEFAULT_SETTINGS } from "../src/settings/types";

/** A tiny in-memory stand-in for AsyncStorage, so these tests never touch a real native module. */
function fakeStorage(): KeyValueStorage {
  const map = new Map<string, string>();
  return {
    getItem: async (key) => map.get(key) ?? null,
    setItem: async (key, value) => {
      map.set(key, value);
    },
    removeItem: async (key) => {
      map.delete(key);
    },
  };
}

describe("settings persistence", () => {
  it("loadSettings returns the defaults when nothing has been saved", async () => {
    const storage = fakeStorage();
    expect(await loadSettings(storage)).toEqual(DEFAULT_SETTINGS);
  });

  it("round-trips a saved choice exactly", async () => {
    const storage = fakeStorage();
    const settings = { ...DEFAULT_SETTINGS, cardBackStyle: "rings" as const };
    await saveSettings(settings, storage);
    expect(await loadSettings(storage)).toEqual(settings);
  });

  it("falls back to the defaults instead of throwing on malformed JSON", async () => {
    const storage = fakeStorage();
    await storage.setItem("king:settings:v1", "{not valid json");
    expect(await loadSettings(storage)).toEqual(DEFAULT_SETTINGS);
  });

  it("falls back to the defaults for a mismatched version instead of risking a crash on a stale shape", async () => {
    const storage = fakeStorage();
    await storage.setItem("king:settings:v1", JSON.stringify({ ...DEFAULT_SETTINGS, version: 999 }));
    expect(await loadSettings(storage)).toEqual(DEFAULT_SETTINGS);
  });
});
