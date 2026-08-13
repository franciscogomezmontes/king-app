import { describe, expect, it } from "vitest";
import { KeyValueStorage, clearSession, loadSession, saveSession } from "../src/scorekeeper/persistence";
import { confirmHand, createScorekeeperState, setCount } from "../src/scorekeeper/state";

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

describe("scorekeeper persistence", () => {
  it("loadSession returns null when nothing has been saved", async () => {
    const storage = fakeStorage();
    expect(await loadSession(storage)).toBeNull();
  });

  it("round-trips a saved session exactly", async () => {
    const storage = fakeStorage();
    let state = createScorekeeperState();
    state = setCount(state, 0, 4);
    state = confirmHand(state);

    await saveSession(state, storage);
    const loaded = await loadSession(storage);
    expect(loaded).toEqual(state);
  });

  it("clearSession removes the saved session", async () => {
    const storage = fakeStorage();
    const state = createScorekeeperState();
    await saveSession(state, storage);
    await clearSession(storage);
    expect(await loadSession(storage)).toBeNull();
  });

  it("discards malformed JSON instead of throwing", async () => {
    const storage = fakeStorage();
    await storage.setItem("king:scorekeeper:v1", "{not valid json");
    expect(await loadSession(storage)).toBeNull();
  });

  it("discards a session with a mismatched version instead of risking a crash on a stale shape", async () => {
    const storage = fakeStorage();
    const staleState = { ...createScorekeeperState(), version: 999 };
    await storage.setItem("king:scorekeeper:v1", JSON.stringify(staleState));
    expect(await loadSession(storage)).toBeNull();
  });
});
