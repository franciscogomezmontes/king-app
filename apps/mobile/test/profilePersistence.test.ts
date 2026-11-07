import { describe, expect, it } from "vitest";
import { KeyValueStorage } from "../src/scorekeeper/persistence";
import { loadProfile, saveProfile } from "../src/profile/persistence";
import { DEFAULT_PROFILE } from "../src/profile/types";

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

describe("profile persistence", () => {
  it("loadProfile returns the defaults (no name, no avatar) when nothing has been saved", async () => {
    const storage = fakeStorage();
    expect(await loadProfile(storage)).toEqual(DEFAULT_PROFILE);
  });

  it("round-trips a saved name and avatar choice exactly", async () => {
    const storage = fakeStorage();
    const profile = { ...DEFAULT_PROFILE, name: "Francisco", avatarIndex: 4 };
    await saveProfile(profile, storage);
    expect(await loadProfile(storage)).toEqual(profile);
  });

  it("falls back to the defaults instead of throwing on malformed JSON", async () => {
    const storage = fakeStorage();
    await storage.setItem("king:profile:v1", "{not valid json");
    expect(await loadProfile(storage)).toEqual(DEFAULT_PROFILE);
  });

  it("falls back to the defaults for a mismatched version instead of risking a crash on a stale shape", async () => {
    const storage = fakeStorage();
    await storage.setItem("king:profile:v1", JSON.stringify({ ...DEFAULT_PROFILE, version: 999 }));
    expect(await loadProfile(storage)).toEqual(DEFAULT_PROFILE);
  });
});
