import { describe, expect, it } from "vitest";
import { Card, createGame, DEFAULT_GAME_RULES, GameState, PlayerIndex, Trick } from "rules-engine";
import { isMasterCard, opponentVoidCount, trackCards } from "../src/cardTracker";

function card(suit: Card["suit"], rank: Card["rank"]): Card {
  return { suit, rank };
}

function trick(plays: { player: PlayerIndex; card: Card }[], winner: PlayerIndex): Trick {
  return { plays, winner };
}

describe("trackCards", () => {
  it("records every card from completed tricks and the trick in progress", () => {
    const state: GameState = {
      ...createGame(DEFAULT_GAME_RULES, 0),
      completedTricks: [
        trick(
          [
            { player: 0, card: card("S", 5) },
            { player: 1, card: card("S", 6) },
            { player: 2, card: card("S", 7) },
            { player: 3, card: card("S", 8) },
          ],
          3,
        ),
      ],
      currentTrick: [{ player: 0, card: card("H", 2) }],
    };
    const tracker = trackCards(state);
    expect(tracker.playedCards.has("S5")).toBe(true);
    expect(tracker.playedCards.has("S8")).toBe(true);
    expect(tracker.playedCards.has("H2")).toBe(true);
    expect(tracker.playedCards.has("H3")).toBe(false);
  });

  it("infers a player is void in a suit the moment they don't follow it", () => {
    const state: GameState = {
      ...createGame(DEFAULT_GAME_RULES, 0),
      completedTricks: [
        trick(
          [
            { player: 0, card: card("S", 5) },
            { player: 1, card: card("H", 2) }, // didn't follow spades
            { player: 2, card: card("S", 7) },
            { player: 3, card: card("S", 8) },
          ],
          3,
        ),
      ],
      currentTrick: [],
    };
    const tracker = trackCards(state);
    expect(tracker.voidSuits[1].has("S")).toBe(true);
    expect(tracker.voidSuits[0].has("S")).toBe(false); // led spades, not void in it
    expect(tracker.voidSuits[2].has("S")).toBe(false); // followed suit
  });

  it("never retracts a void inference once seen, even across later tricks", () => {
    const state: GameState = {
      ...createGame(DEFAULT_GAME_RULES, 0),
      completedTricks: [
        trick(
          [
            { player: 0, card: card("S", 5) },
            { player: 1, card: card("H", 2) },
            { player: 2, card: card("S", 7) },
            { player: 3, card: card("S", 8) },
          ],
          3,
        ),
        trick(
          [
            { player: 1, card: card("D", 9) },
            { player: 2, card: card("D", 2) },
            { player: 3, card: card("D", 3) },
            { player: 0, card: card("D", 4) },
          ],
          1,
        ),
      ],
      currentTrick: [],
    };
    const tracker = trackCards(state);
    expect(tracker.voidSuits[1].has("S")).toBe(true);
  });
});

describe("isMasterCard", () => {
  it("is true once every higher card of that suit is accounted for as played", () => {
    const tracker = {
      playedCards: new Set(["S14", "S12", "S11"]),
      voidSuits: { 0: new Set<Card["suit"]>(), 1: new Set<Card["suit"]>(), 2: new Set<Card["suit"]>(), 3: new Set<Card["suit"]>() },
    };
    // King of spades (13) is master once Ace(14), Queen(12), and Jack(11) are all gone.
    expect(isMasterCard(card("S", 13), [], tracker)).toBe(true);
  });

  it("is true when every higher card of that suit is in the player's own hand", () => {
    const tracker = {
      playedCards: new Set<string>(),
      voidSuits: { 0: new Set<Card["suit"]>(), 1: new Set<Card["suit"]>(), 2: new Set<Card["suit"]>(), 3: new Set<Card["suit"]>() },
    };
    expect(isMasterCard(card("S", 13), [card("S", 14)], tracker)).toBe(true);
  });

  it("is false when a higher card is neither played nor in the player's own hand", () => {
    const tracker = {
      playedCards: new Set<string>(),
      voidSuits: { 0: new Set<Card["suit"]>(), 1: new Set<Card["suit"]>(), 2: new Set<Card["suit"]>(), 3: new Set<Card["suit"]>() },
    };
    expect(isMasterCard(card("S", 13), [], tracker)).toBe(false);
  });

  it("an ace is always a master (nothing outranks it)", () => {
    const tracker = {
      playedCards: new Set<string>(),
      voidSuits: { 0: new Set<Card["suit"]>(), 1: new Set<Card["suit"]>(), 2: new Set<Card["suit"]>(), 3: new Set<Card["suit"]>() },
    };
    expect(isMasterCard(card("S", 14), [], tracker)).toBe(true);
  });
});

describe("opponentVoidCount", () => {
  it("counts void opponents, excluding the player themselves", () => {
    const tracker = {
      playedCards: new Set<string>(),
      voidSuits: {
        0: new Set<Card["suit"]>(["S"]),
        1: new Set<Card["suit"]>(["S"]),
        2: new Set<Card["suit"]>(),
        3: new Set<Card["suit"]>(),
      },
    };
    expect(opponentVoidCount(tracker, 0, "S")).toBe(1); // only player 1 counts
    expect(opponentVoidCount(tracker, 2, "S")).toBe(2); // players 0 and 1
    expect(opponentVoidCount(tracker, 0, "H")).toBe(0);
  });
});
