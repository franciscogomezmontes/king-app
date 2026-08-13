import { HAND_SEQUENCE, HandType, NEGATIVE_HAND_EXPECTED_COUNT, PlayerIndex } from "rules-engine";
import { describe, expect, it } from "vitest";
import {
  ScorekeeperState,
  confirmHand,
  createScorekeeperState,
  currentHandType,
  isGameComplete,
  setCount,
  setDirection,
} from "../src/scorekeeper/state";

/** Sets all four players' draft counts at once, for terser test setup. */
function withDraft(state: ScorekeeperState, counts: Record<PlayerIndex, number>): ScorekeeperState {
  let next = state;
  for (const player of [0, 1, 2, 3] as PlayerIndex[]) {
    next = setCount(next, player, counts[player]);
  }
  return next;
}

/** A valid (sums-to-the-right-total) count split for any hand type, all credited to player 0 —
 * enough to drive a full game through `confirmHand` without tripping the engine's math, without
 * this test needing to care about realistic distributions. */
function defaultCountsFor(handType: HandType): Record<PlayerIndex, number> {
  const total = handType === "positive" ? 13 : NEGATIVE_HAND_EXPECTED_COUNT[handType];
  return { 0: total, 1: 0, 2: 0, 3: 0 };
}

describe("scorekeeper state — createScorekeeperState", () => {
  it("starts at hand 0, all-zero drafts and totals, empty history", () => {
    const state = createScorekeeperState();
    expect(state.handIndex).toBe(0);
    expect(currentHandType(state)).toBe(HAND_SEQUENCE[0]);
    expect(isGameComplete(state)).toBe(false);
    expect(state.draftCounts).toEqual({ 0: 0, 1: 0, 2: 0, 3: 0 });
    expect(state.cumulativeScores).toEqual({ 0: 0, 1: 0, 2: 0, 3: 0 });
    expect(state.history).toEqual([]);
  });
});

describe("scorekeeper state — confirmHand", () => {
  it("matches the family's King Scorekeeper.xlsx 'No Bazas' reference row: 4/4/2/3 tricks -> -80/-80/-40/-60", () => {
    const state = confirmHand(withDraft(createScorekeeperState(), { 0: 4, 1: 4, 2: 2, 3: 3 }));
    expect(state.history[0].scores).toEqual({ 0: -80, 1: -80, 2: -40, 3: -60 });
    expect(state.cumulativeScores).toEqual({ 0: -80, 1: -80, 2: -40, 3: -60 });
  });

  it("advances handIndex, resets drafts, and appends to history", () => {
    let state = withDraft(createScorekeeperState(), { 0: 4, 1: 4, 2: 2, 3: 3 });
    state = confirmHand(state);
    expect(state.handIndex).toBe(1);
    expect(currentHandType(state)).toBe(HAND_SEQUENCE[1]);
    expect(state.draftCounts).toEqual({ 0: 0, 1: 0, 2: 0, 3: 0 });
    expect(state.history).toHaveLength(1);
    expect(state.history[0].handType).toBe(HAND_SEQUENCE[0]);
    expect(state.history[0].counts).toEqual({ 0: 4, 1: 4, 2: 2, 3: 3 });
    expect(state.history[0].direction).toBeNull();
  });

  it("scores a positive hand via the chosen direction and records it on the entry", () => {
    let state = createScorekeeperState();
    for (let i = 0; i < 6; i++) state = confirmHand(withDraft(state, defaultCountsFor(HAND_SEQUENCE[i])));
    expect(currentHandType(state)).toBe("positive");

    state = setDirection(state, "down");
    state = withDraft(state, { 0: 3, 1: 2, 2: 5, 3: 3 });
    state = confirmHand(state);

    const positiveEntry = state.history[6];
    expect(positiveEntry.handType).toBe("positive");
    expect(positiveEntry.direction).toBe("down");
    // down: 325 - 75*tricks
    expect(positiveEntry.scores).toEqual({ 0: 100, 1: 175, 2: -50, 3: 100 });
  });

  it("is a no-op once the game is already complete", () => {
    let state = createScorekeeperState();
    for (const handType of HAND_SEQUENCE) {
      state = confirmHand(withDraft(state, defaultCountsFor(handType)));
    }
    expect(isGameComplete(state)).toBe(true);

    const beforeExtra = state;
    state = confirmHand(state);
    expect(state).toEqual(beforeExtra);
  });

  it("a full 10-hand game sums to exactly 0 across all 4 players (zero-sum end to end)", () => {
    let state = createScorekeeperState();
    for (const handType of HAND_SEQUENCE) {
      state = confirmHand(withDraft(state, defaultCountsFor(handType)));
    }
    const total =
      state.cumulativeScores[0] + state.cumulativeScores[1] + state.cumulativeScores[2] + state.cumulativeScores[3];
    expect(total).toBe(0);
  });
});
