import { describe, expect, it } from "vitest";
import { createGame, DEFAULT_GAME_RULES, HAND_SEQUENCE } from "../../src/game/state";

describe("HAND_SEQUENCE", () => {
  it("is the six negative hands (in order), followed by four positive hands", () => {
    expect(HAND_SEQUENCE).toEqual([
      "noTricks",
      "noHearts",
      "noGentlemen",
      "noLady",
      "noKingOfHearts",
      "noLastTwo",
      "positive",
      "positive",
      "positive",
      "positive",
    ]);
  });
});

describe("createGame", () => {
  it("starts at handIndex 0, matching HAND_SEQUENCE[0], phase awaiting-deal", () => {
    const state = createGame(DEFAULT_GAME_RULES, 0);
    expect(state.handIndex).toBe(0);
    expect(state.handType).toBe(HAND_SEQUENCE[0]);
    expect(state.phase).toBe("awaiting-deal");
  });

  it("sets both dealer and firstDealer to the given first dealer", () => {
    const state = createGame(DEFAULT_GAME_RULES, 2);
    expect(state.dealer).toBe(2);
    expect(state.firstDealer).toBe(2);
  });

  it("zeroes cumulative scores and starts with empty hand history", () => {
    const state = createGame(DEFAULT_GAME_RULES, 0);
    expect(state.cumulativeScores).toEqual({ 0: 0, 1: 0, 2: 0, 3: 0 });
    expect(state.handHistory).toEqual([]);
  });

  it("has no positive-hand setup yet, since hand 0 is a negative hand", () => {
    const state = createGame(DEFAULT_GAME_RULES, 0);
    expect(state.positiveSetup).toBeNull();
  });
});
