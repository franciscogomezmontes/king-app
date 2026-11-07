import { describe, expect, it } from "vitest";
import { Card, createDeck, createGame, DEFAULT_GAME_RULES, GameState, PlayerIndex, Trick } from "rules-engine";
import { determinizeHands } from "../src/ismcts";
import { trackCards } from "../src/cardTracker";

function cardKey(c: Card): string {
  return `${c.suit}${c.rank}`;
}

function mulberry32(seed: number) {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ALL_SEATS: PlayerIndex[] = [0, 1, 2, 3];

/**
 * Builds an internally-consistent GameState for a determinization test: a real 52-card deck split
 * into one already-completed trick (`playedPerSeat`, one card per seat, in seat order 0-1-2-3) plus
 * a remaining hand per seat — total accounted-for cards always exactly 52, which
 * `determinizeHands` requires (it's always true of any real reachable GameState; hand-built
 * fixtures have to preserve that same invariant on purpose).
 */
function withTrickAndHands(playedPerSeat: Card[], remainingPerSeat: Record<PlayerIndex, Card[]>): GameState {
  const trick: Trick = {
    plays: ALL_SEATS.map((seat) => ({ player: seat, card: playedPerSeat[seat] })),
    winner: 0,
  };
  return {
    ...createGame(DEFAULT_GAME_RULES, 0),
    completedTricks: [trick],
    currentTrick: [],
    hands: remainingPerSeat,
  };
}

describe("determinizeHands", () => {
  it("keeps the searching player's own hand exactly as given", () => {
    const deck = createDeck();
    const played = [deck[0], deck[1], deck[2], deck[3]];
    const rest = deck.slice(4);
    const hands: Record<PlayerIndex, Card[]> = { 0: rest.slice(0, 12), 1: rest.slice(12, 24), 2: rest.slice(24, 36), 3: rest.slice(36, 48) };
    const state = withTrickAndHands(played, hands);

    const dealt = determinizeHands(state, 0, mulberry32(1));
    expect(dealt[0]).toEqual(hands[0]);
  });

  it("gives each opponent exactly their known remaining card count", () => {
    const deck = createDeck();
    const played = [deck[0], deck[1], deck[2], deck[3]];
    const rest = deck.slice(4);
    // Uneven remaining counts: 12, 10, 12, 14 (still summing to 48).
    const hands: Record<PlayerIndex, Card[]> = {
      0: rest.slice(0, 12),
      1: rest.slice(12, 22),
      2: rest.slice(22, 34),
      3: rest.slice(34, 48),
    };
    const state = withTrickAndHands(played, hands);

    const dealt = determinizeHands(state, 0, mulberry32(2));
    expect(dealt[1]).toHaveLength(10);
    expect(dealt[2]).toHaveLength(12);
    expect(dealt[3]).toHaveLength(14);
  });

  it("never deals a card that's already been played or is in the searching player's own hand", () => {
    const deck = createDeck();
    const played = [deck[0], deck[1], deck[2], deck[3]];
    const rest = deck.slice(4);
    const hands: Record<PlayerIndex, Card[]> = { 0: rest.slice(0, 12), 1: rest.slice(12, 24), 2: rest.slice(24, 36), 3: rest.slice(36, 48) };
    const state = withTrickAndHands(played, hands);

    const dealt = determinizeHands(state, 0, mulberry32(3));
    const playedKeys = new Set(played.map(cardKey));
    const ownKeys = new Set(hands[0].map(cardKey));
    for (const seat of [1, 2, 3] as PlayerIndex[]) {
      for (const c of dealt[seat]) {
        expect(playedKeys.has(cardKey(c))).toBe(false);
        expect(ownKeys.has(cardKey(c))).toBe(false);
      }
    }
  });

  it("never deals a card of a suit an opponent has already shown void in", () => {
    const deck = createDeck();
    // Seat 0 leads a spade; seat 1 plays a heart instead (void in spades); seats 2/3 follow suit.
    const spades = deck.filter((c) => c.suit === "S");
    const hearts = deck.filter((c) => c.suit === "H");
    const others = deck.filter((c) => c.suit !== "S" && c.suit !== "H");
    const played = [spades[0], hearts[0], spades[1], spades[2]];
    const rest = [...spades.slice(3), ...hearts.slice(1), ...others];
    // rest has 13-3 + 13-1 + 26 = 10 + 12 + 26 = 48 cards.
    const hands: Record<PlayerIndex, Card[]> = { 0: rest.slice(0, 12), 1: rest.slice(12, 24), 2: rest.slice(24, 36), 3: rest.slice(36, 48) };
    const state = withTrickAndHands(played, hands);

    for (let seed = 1; seed <= 30; seed++) {
      const dealt = determinizeHands(state, 0, mulberry32(seed));
      expect(dealt[1].some((c) => c.suit === "S")).toBe(false);
    }
  });

  it("respects multiple simultaneous voids across different opponents and suits", () => {
    const deck = createDeck();
    const spades = deck.filter((c) => c.suit === "S");
    const hearts = deck.filter((c) => c.suit === "H");
    const clubs = deck.filter((c) => c.suit === "C");
    const diamonds = deck.filter((c) => c.suit === "D");
    // Trick 1: seat 0 leads spade, seat 1 discards a heart (void in spades), 2/3 follow.
    const trick1Plays: Card[] = [spades[0], hearts[0], spades[1], spades[2]];
    // Trick 2: seat 3 leads a heart, seat 2 discards a club (void in hearts), 0/1 follow.
    const trick2Plays: Card[] = [hearts[1], hearts[2], clubs[0], hearts[3]]; // seat order 0,1,2,3 in this fixture's trick-building convention

    const usedSpades = spades.slice(0, 3);
    const usedHearts = [hearts[0], hearts[1], hearts[2], hearts[3]];
    const usedClubs = [clubs[0]];
    const remainingSpades = spades.slice(3);
    const remainingHearts = hearts.slice(4);
    const remainingClubs = clubs.slice(1);
    const rest = [...remainingSpades, ...remainingHearts, ...remainingClubs, ...diamonds];

    const trick1: Trick = { plays: ALL_SEATS.map((seat) => ({ player: seat, card: trick1Plays[seat] })), winner: 0 };
    const trick2: Trick = { plays: ALL_SEATS.map((seat) => ({ player: seat, card: trick2Plays[seat] })), winner: 3 };

    const hands: Record<PlayerIndex, Card[]> = { 0: rest.slice(0, 11), 1: rest.slice(11, 22), 2: rest.slice(22, 33), 3: rest.slice(33, 44) };
    // rest.length = 52 - usedSpades(3) - usedHearts(4) - usedClubs(1) = 44 — matches 11x4.
    const state: GameState = {
      ...createGame(DEFAULT_GAME_RULES, 0),
      completedTricks: [trick1, trick2],
      currentTrick: [],
      hands,
    };

    for (let seed = 1; seed <= 30; seed++) {
      const dealt = determinizeHands(state, 0, mulberry32(seed));
      expect(dealt[1].some((c) => c.suit === "S")).toBe(false);
      expect(dealt[2].some((c) => c.suit === "H")).toBe(false);
    }
  });

  it("produces a full, non-overlapping 52-card deal together with the searching player's own hand and the played cards", () => {
    const deck = createDeck();
    const played = [deck[0], deck[1], deck[2], deck[3]];
    const rest = deck.slice(4);
    const hands: Record<PlayerIndex, Card[]> = { 0: rest.slice(0, 12), 1: rest.slice(12, 24), 2: rest.slice(24, 36), 3: rest.slice(36, 48) };
    const state = withTrickAndHands(played, hands);

    const dealt = determinizeHands(state, 0, mulberry32(7));
    const tracker = trackCards(state);
    const allKeys = new Set<string>();
    for (const seat of ALL_SEATS) {
      for (const c of seat === 0 ? state.hands[0] : dealt[seat]) {
        expect(allKeys.has(cardKey(c))).toBe(false); // no duplicates across the whole deal
        allKeys.add(cardKey(c));
      }
    }
    for (const key of tracker.playedCards) expect(allKeys.has(key)).toBe(false);
    expect(allKeys.size + tracker.playedCards.size).toBe(52);
  });
});
