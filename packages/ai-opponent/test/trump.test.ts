import { describe, expect, it } from "vitest";
import { Card, createGame, DEFAULT_GAME_RULES, GameState } from "rules-engine";
import { chooseTrumpDeclaration, shouldOpenAuction } from "../src/trump";

function card(suit: Card["suit"], rank: Card["rank"]): Card {
  return { suit, rank };
}

function stateWithDealerHand(hand: Card[]): GameState {
  return { ...createGame(DEFAULT_GAME_RULES, 0), hands: { 0: hand, 1: [], 2: [], 3: [] } };
}

describe("shouldOpenAuction", () => {
  it("opens an auction with a weak hand", () => {
    const weak = [card("S", 2), card("H", 3), card("D", 4), card("C", 5)];
    expect(shouldOpenAuction(stateWithDealerHand(weak), 0)).toBe(true);
  });

  it("declares directly (no auction) with a strong hand", () => {
    const strong = [card("S", 14), card("H", 14), card("D", 14), card("C", 13)];
    expect(shouldOpenAuction(stateWithDealerHand(strong), 0)).toBe(false);
  });
});

describe("chooseTrumpDeclaration", () => {
  it("declares its longest suit when it's long enough", () => {
    const state = stateWithDealerHand([
      card("C", 2),
      card("C", 5),
      card("C", 9),
      card("C", 13),
      card("S", 3),
      card("H", 4),
    ]);
    const declaration = chooseTrumpDeclaration(state, 0);
    expect(declaration.trump).toBe("C");
    expect(declaration.direction).toBe("up");
    expect(declaration.backwards).toBe(false);
  });

  it("declares no-trump when no suit is long enough", () => {
    const state = stateWithDealerHand([card("S", 2), card("H", 3), card("D", 4)]);
    expect(chooseTrumpDeclaration(state, 0).trump).toBeNull();
  });
});
