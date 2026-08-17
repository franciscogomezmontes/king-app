import { describe, expect, it } from "vitest";
import { createGame, DEFAULT_GAME_RULES } from "rules-engine";
import { clearSoloSession, KeyValueStorage, loadSoloSession, saveSoloSession } from "../src/game/persistence";
import { InitialGameState } from "../src/game/store";

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

function sampleSession(): InitialGameState {
  return {
    game: createGame(DEFAULT_GAME_RULES, 0),
    humanSeat: 0,
    difficulty: "normal",
    botRosterIndices: [0, 1, 2],
    biddingIndex: 0,
  };
}

describe("solo game persistence", () => {
  it("loadSoloSession returns null when nothing has been saved", async () => {
    const storage = fakeStorage();
    expect(await loadSoloSession(storage)).toBeNull();
  });

  it("round-trips a saved in-progress session exactly", async () => {
    const storage = fakeStorage();
    const session = sampleSession();

    await saveSoloSession(session, storage);
    const loaded = await loadSoloSession(storage);

    expect(loaded).toEqual({ version: 2, ...session });
  });

  it("clearSoloSession removes the saved session", async () => {
    const storage = fakeStorage();
    await saveSoloSession(sampleSession(), storage);
    await clearSoloSession(storage);
    expect(await loadSoloSession(storage)).toBeNull();
  });

  it("a later save overwrites the earlier one, not appends", async () => {
    const storage = fakeStorage();
    await saveSoloSession(sampleSession(), storage);
    const second = { ...sampleSession(), biddingIndex: 3, difficulty: "hard" as const };
    await saveSoloSession(second, storage);

    const loaded = await loadSoloSession(storage);
    expect(loaded?.biddingIndex).toBe(3);
    expect(loaded?.difficulty).toBe("hard");
  });

  it("discards malformed JSON instead of throwing", async () => {
    const storage = fakeStorage();
    await storage.setItem("king:soloGame:v1", "{not valid json");
    expect(await loadSoloSession(storage)).toBeNull();
  });

  it("discards a session with a mismatched version instead of risking a crash on a stale shape", async () => {
    const storage = fakeStorage();
    const stale = { ...sampleSession(), version: 999 };
    await storage.setItem("king:soloGame:v1", JSON.stringify(stale));
    expect(await loadSoloSession(storage)).toBeNull();
  });
});
