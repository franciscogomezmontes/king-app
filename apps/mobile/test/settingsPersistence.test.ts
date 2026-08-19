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
    const settings = { ...DEFAULT_SETTINGS, cardBackStyle: "medallion" as const };
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

  it("keeps a saved gameRules choice for fields it set", async () => {
    const storage = fakeStorage();
    const settings = { ...DEFAULT_SETTINGS, gameRules: { ...DEFAULT_SETTINGS.gameRules, backwardsEnabled: true } };
    await saveSettings(settings, storage);
    expect((await loadSettings(storage)).gameRules.backwardsEnabled).toBe(true);
  });

  it("falls back to the default card back for a renamed/removed cardBackStyle value instead of keeping the stale one", async () => {
    const storage = fakeStorage();
    // Simulates a blob saved back when this field could be "lattice"/"rings"/"frame" (or later
    // "suitMedallion"/"kMonogram"/"artDecoSunburst", before either was renamed) — CardBack.tsx's
    // CARD_BACK_IMAGES has no entry for any of those any more.
    await storage.setItem(
      "king:settings:v1",
      JSON.stringify({ ...DEFAULT_SETTINGS, cardBackStyle: "kMonogram" }),
    );
    const loaded = await loadSettings(storage);
    expect(loaded.cardBackStyle).toBe(DEFAULT_SETTINGS.cardBackStyle);
    // The rest of the blob wasn't discarded wholesale over one stale field — same forward-
    // compatibility spirit as the gameRules field-merge below.
    expect(loaded.saveHistoryEnabled).toBe(DEFAULT_SETTINGS.saveHistoryEnabled);
  });

  it("fills in a missing gameRules field with its default instead of undefined (forward compatibility)", async () => {
    const storage = fakeStorage();
    // Simulates a blob saved before some future GameRules field existed: gameRules is present
    // but incomplete, not absent entirely.
    const { auctionMustSell: _dropped, ...incompleteGameRules } = DEFAULT_SETTINGS.gameRules;
    await storage.setItem(
      "king:settings:v1",
      JSON.stringify({ ...DEFAULT_SETTINGS, gameRules: incompleteGameRules }),
    );
    const loaded = await loadSettings(storage);
    expect(loaded.gameRules.auctionMustSell).toBe(DEFAULT_SETTINGS.gameRules.auctionMustSell);
  });
});
