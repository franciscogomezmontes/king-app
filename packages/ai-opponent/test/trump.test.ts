import { describe, expect, it } from "vitest";
import { Card, createGame, DEFAULT_GAME_RULES, GameState } from "rules-engine";
import { chooseTrumpDeclaration, shouldOpenAuction } from "../src/trump";

function card(suit: Card["suit"], rank: Card["rank"]): Card {
  return { suit, rank };
}

function stateWithDealerHand(hand: Card[], auctionMustSell = false): GameState {
  return {
    ...createGame({ ...DEFAULT_GAME_RULES, auctionMustSell }, 0),
    hands: { 0: hand, 1: [], 2: [], 3: [] },
  };
}

describe("shouldOpenAuction", () => {
  it("opens an auction with a weak hand", () => {
    const weak = [card("S", 2), card("H", 3), card("D", 4), card("C", 5)];
    expect(shouldOpenAuction(stateWithDealerHand(weak), 0)).toBe(true);
  });

  it("declares directly (no auction) with a genuinely strong hand", () => {
    // Opening the auction is a free option (the dealer can always decline any bid), so only a hand
    // strong enough that no realistic bid would beat it should skip soliciting offers at all — see
    // AUCTION_THRESHOLD_NOT_FORCED's own doc comment. Three ace-king pairs plus a bare ace
    // (estimateTricks = 7) is that kind of hand; the old fixture here (3 aces + a king,
    // estimateTricks = 3) is no longer strong enough to clear the new, more permissive threshold —
    // by design, per the auction-economics fix.
    const strong = [
      card("S", 14),
      card("S", 13),
      card("H", 14),
      card("H", 13),
      card("D", 14),
      card("D", 13),
      card("C", 14),
    ];
    expect(shouldOpenAuction(stateWithDealerHand(strong), 0)).toBe(false);
  });

  it("opening is a free option when auctionMustSell is off — even a moderately good hand (3 aces + a king, estimateTricks = 3) still opens", () => {
    const moderate = [card("S", 14), card("H", 14), card("D", 14), card("C", 13)];
    expect(shouldOpenAuction(stateWithDealerHand(moderate, false), 0)).toBe(true);
  });

  it("stays cautious about opening when auctionMustSell is on, since opening then commits to selling to the highest bid", () => {
    const moderate = [card("S", 14), card("H", 14), card("D", 14), card("C", 13)];
    expect(shouldOpenAuction(stateWithDealerHand(moderate, true), 0)).toBe(false);
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
