import { describe, expect, it } from "vitest";
import { AuctionBid, Card, createGame, DEFAULT_GAME_RULES, GameState } from "rules-engine";
import { chooseBid, chooseDealerDecision } from "../src/auction";

function card(suit: Card["suit"], rank: Card["rank"]): Card {
  return { suit, rank };
}

const strongHand = [card("S", 14), card("H", 14), card("D", 14), card("C", 13)]; // estimateTricks = 5
const weakHand = [card("S", 2), card("H", 3), card("D", 4), card("C", 5)]; // estimateTricks = 0

function stateWithBids(hand: Card[], bids: AuctionBid[]): GameState {
  return {
    ...createGame(DEFAULT_GAME_RULES, 0),
    handType: "positive",
    hands: { 0: [], 1: hand, 2: [], 3: [] },
    positiveSetup: {
      trumpNamer: 0,
      trump: null,
      direction: "up",
      backwards: false,
      auctionOpened: true,
      bids,
      auction: null,
    },
  };
}

describe("chooseBid", () => {
  it("bids its hand estimate when it exceeds the current high bid", () => {
    expect(chooseBid(stateWithBids(strongHand, []), 1)).toBe(5);
  });

  it("declines when its estimate doesn't exceed the current high bid", () => {
    const bids: AuctionBid[] = [{ player: 2, tricks: 6 }];
    expect(chooseBid(stateWithBids(strongHand, bids), 1)).toBeNull();
  });
});

describe("chooseDealerDecision", () => {
  it("sells when the top bid exceeds the dealer's own estimate", () => {
    const bids: AuctionBid[] = [{ player: 1, tricks: 6 }];
    const state = stateWithBids(weakHand, bids); // dealer (seat 0) has an empty hand => estimate 0
    expect(chooseDealerDecision(state, 0)).toBe(true);
  });

  it("declines when the top bid doesn't exceed the dealer's own estimate", () => {
    const state: GameState = {
      ...stateWithBids(weakHand, [{ player: 1, tricks: 2 }]),
      hands: { 0: strongHand, 1: weakHand, 2: [], 3: [] },
    };
    expect(chooseDealerDecision(state, 0)).toBe(false);
  });

  it("declines when there are no bids at all", () => {
    expect(chooseDealerDecision(stateWithBids(weakHand, []), 0)).toBe(false);
  });
});
