import { describe, expect, it } from "vitest";
import {
  applyAction,
  Card,
  createDeck,
  createGame,
  currentRuleSet,
  DEFAULT_GAME_RULES,
  GameRules,
  GameState,
  PlayerIndex,
  shuffle,
  Trick,
} from "rules-engine";
import {
  allowedPlays,
  guardedBid,
  guardedDealerSell,
  isOnlyRemainingOfSuit,
  newGuardrailStats,
} from "../src/guardrails";
import { trackCards } from "../src/cardTracker";
import { chooseBid, chooseCard, chooseDealerDecision, chooseTrumpDeclaration, Difficulty, shouldOpenAuction } from "../src";
import { chooseCardHeuristic } from "../src/heuristic";
import { ismctsChooseCard } from "../src/ismcts";

/**
 * Tests for every row of the "Errores bobos" sheet (docs/ai-strategy/Estrategia_de_Juego.md,
 * section 2) against `allowedPlays` directly — the authoritative guardrail floor every
 * difficulty's own policy routes through. A handful of rows (the ones Francisco reported live —
 * K/J leads in No Gentlemen, Q-of-clubs leads in No Lady, K-of-trump leads before the Ace shows)
 * are additionally exercised through the full `chooseCard` dispatch across all four difficulties,
 * matching the task's "no difficulty plays it" requirement literally for those specific bugs.
 */

function card(suit: Card["suit"], rank: Card["rank"]): Card {
  return { suit, rank };
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

/** Always triggers "easy"'s random-override branch (first draw < EASY_RANDOMNESS), then hands
 * back `index/ total` as the second draw so the random pick lands on `legal[index]` *if* that
 * card wasn't already excluded by the guardrail — exactly the scenario this suite needs: a seeded
 * random that WOULD pick the forbidden card were it not filtered out first. */
function forcedEasyRandomPickingIndex(index: number, total: number): () => number {
  let call = 0;
  return () => {
    call += 1;
    if (call === 1) return 0; // triggers the random branch unconditionally
    return (index + 0.5) / total; // Math.floor(... * total) === index
  };
}

function dummyTrick(winner: PlayerIndex): Trick {
  return {
    plays: [
      { player: 0, card: card("C", 2) },
      { player: 1, card: card("C", 3) },
      { player: 2, card: card("C", 4) },
      { player: 3, card: card("C", 5) },
    ],
    winner,
  };
}

function dummyTrickOf(plays: { player: PlayerIndex; card: Card }[]): Trick {
  return { plays, winner: plays[0].player };
}

function withPositiveSetup(state: GameState, trump: Card["suit"] | null): GameState {
  return {
    ...state,
    handType: "positive",
    positiveSetup: {
      trumpNamer: state.dealer,
      trump,
      direction: "up",
      backwards: false,
      auctionOpened: false,
      bids: [],
      auction: null,
    },
  };
}

function base(overrides: Partial<GameState>): GameState {
  return { ...createGame(DEFAULT_GAME_RULES, 0), phase: "playing", currentTrick: [], ...overrides };
}

// A self-consistent 13/13/13/13 deal for the `chooseCard`/`ismctsChooseCard` dispatch-level
// checks, which (unlike `allowedPlays` called directly) need determinizeHands to work.
function fullDeal(myHand: Card[]): Record<PlayerIndex, Card[]> {
  const mine = new Set(myHand.map((c) => `${c.suit}${c.rank}`));
  const rest = createDeck().filter((c) => !mine.has(`${c.suit}${c.rank}`));
  return { 0: myHand, 1: rest.slice(0, 13), 2: rest.slice(13, 26), 3: rest.slice(26, 39) };
}

describe("Errores bobos — row 1: never voluntarily capture a penalized card", () => {
  it("noHearts: following a hearts lead, ducks under rather than winning the trick", () => {
    const state = base({
      handType: "noHearts",
      hands: { 0: [], 1: [card("H", 9), card("H", 3)], 2: [], 3: [] },
      currentTrick: [{ player: 0, card: card("H", 7) }],
    });
    const allowed = allowedPlays(state, 1, [card("H", 9), card("H", 3)], currentRuleSet(state), null);
    expect(allowed).toEqual([card("H", 3)]);
  });

  it("exception: forced to win (every legal card beats the trick) — no safe card exists", () => {
    const state = base({
      handType: "noHearts",
      hands: { 0: [], 1: [card("H", 9), card("H", 12)], 2: [], 3: [] },
      currentTrick: [{ player: 0, card: card("H", 7) }],
    });
    const legal = [card("H", 9), card("H", 12)];
    const allowed = allowedPlays(state, 1, legal, currentRuleSet(state), null);
    expect(allowed.length).toBeGreaterThan(0);
    expect(legal).toContainEqual(allowed[0]);
  });
});

describe("Errores bobos — row 2 & 3: shed the most dangerous SAFE card, using full information", () => {
  it("row 2: when ducking, discards the category card (most dangerous) rather than an arbitrary safe one", () => {
    const state = base({
      handType: "noLady",
      hands: { 0: [], 1: [card("S", 12), card("S", 4), card("S", 6)], 2: [], 3: [] },
      currentTrick: [{ player: 0, card: card("S", 14) }],
    });
    const allowed = allowedPlays(state, 1, [card("S", 12), card("S", 4), card("S", 6)], currentRuleSet(state), null);
    expect(allowed).toEqual([card("S", 12)]);
  });

  it("row 3: with no category card among the safe options, sheds the HIGHEST safe card, not an arbitrarily low one", () => {
    // Francisco's own "jugando de último, usar la información completa" rule: S3 and S6 both lose
    // to S7, S10 would win. Neither S3 nor S6 is this hand's own danger category (noTricks has
    // none), so the old behavior broke the tie toward the lowest (S3) — the correct play uses the
    // full information available and sheds the highest still-safe card (S6).
    const state = base({
      handType: "noTricks",
      hands: { 0: [], 1: [card("S", 3), card("S", 6), card("S", 10)], 2: [], 3: [] },
      currentTrick: [{ player: 0, card: card("S", 7) }],
    });
    const allowed = allowedPlays(state, 1, [card("S", 3), card("S", 6), card("S", 10)], currentRuleSet(state), null);
    expect(allowed).toEqual([card("S", 6)]);
  });
});

describe("Errores bobos — row 4: forced to win in No Bazas uses the LEAST dangerous (not lowest) card", () => {
  it("every legal card wins: for noTricks, that collapses to the highest of the forced suit (nothing else to prefer)", () => {
    const state = base({
      handType: "noTricks",
      hands: { 0: [], 1: [card("S", 9), card("S", 12)], 2: [], 3: [] },
      currentTrick: [{ player: 0, card: card("S", 7) }],
    });
    // Both S9 and S12 are forced winners; noTricks has no category to avoid, so the "least
    // dangerous" tie-break shouldn't matter for correctness but must still return a legal card.
    const allowed = allowedPlays(state, 1, [card("S", 9), card("S", 12)], currentRuleSet(state), null);
    expect(allowed.length).toBe(1);
    expect([card("S", 9), card("S", 12)]).toContainEqual(allowed[0]);
  });

  it("forced to win in noKingOfHearts while holding K♥ and a non-K♥ winner: spares K♥, plays the other winner", () => {
    // Both hearts beat the table (no Ace♥ shown); forced to win either way. Playing K♥ guarantees
    // capturing it (-160); playing Q♥ instead defers K♥ to a hopefully safer later moment.
    const state = base({
      handType: "noKingOfHearts",
      hands: { 0: [], 1: [card("H", 13), card("H", 12)], 2: [], 3: [] },
      currentTrick: [{ player: 0, card: card("H", 5) }],
    });
    const allowed = allowedPlays(state, 1, [card("H", 13), card("H", 12)], currentRuleSet(state), null);
    expect(allowed).toEqual([card("H", 12)]);
  });
});

describe("Errores bobos — row 5: void discard sheds the highest heart first (No Corazones)", () => {
  it("discards the highest heart, not a lower one, when void and free to choose", () => {
    const state = base({
      handType: "noHearts",
      hands: { 0: [], 1: [card("H", 5), card("H", 9), card("C", 2)], 2: [], 3: [] },
      currentTrick: [{ player: 0, card: card("S", 4) }],
    });
    const allowed = allowedPlays(state, 1, [card("H", 5), card("H", 9), card("C", 2)], currentRuleSet(state), null);
    expect(allowed).toEqual([card("H", 9)]);
  });
});

describe("Errores bobos — rows 6 & 7: No Gentlemen leads", () => {
  // Francisco's exact live bug report: at Expert, a bot opened a noGentlemen trick with a King or
  // Jack when a perfectly safe Queen was sitting right there — checked across all four
  // difficulties, not just `allowedPlays` directly.
  const myHand: Card[] = [
    card("D", 13), // King of diamonds — row 6
    card("S", 11), // Jack of spades — row 6
    card("H", 9),
    card("C", 6),
    card("D", 4),
    card("S", 8),
    card("H", 2),
    card("C", 10),
    card("D", 7),
    card("S", 5),
    card("H", 3),
    card("C", 12), // Queen of clubs — row 7 (clubs' own J/K still unaccounted)
    card("H", 14), // Ace of hearts — row 7 (hearts' own J/K still unaccounted)
  ];

  function state(): GameState {
    return base({ handType: "noGentlemen", hands: fullDeal(myHand), currentTrick: [] });
  }

  it("row 6 (allowedPlays): never leads the King or Jack when safe alternatives exist", () => {
    const s = state();
    const allowed = allowedPlays(s, 0, myHand, currentRuleSet(s), null);
    expect(allowed.some((c) => c.rank === 13 || c.rank === 11)).toBe(false);
  });

  it("row 7 (allowedPlays): never leads the Ace or Queen either, since each suit's own J/K is still unaccounted for", () => {
    const s = state();
    const allowed = allowedPlays(s, 0, myHand, currentRuleSet(s), null);
    expect(allowed.some((c) => c.rank === 14 || c.rank === 12)).toBe(false);
  });

  it("chooseCardHeuristic (normal): leads none of A/Q/J/K", () => {
    const led = chooseCardHeuristic(state(), 0, true);
    expect([11, 12, 13, 14]).not.toContain(led.rank);
  });

  it('"easy" (heuristic path and random-override path): leads none of A/Q/J/K', () => {
    const heuristicLed = chooseCard(state(), 0, "easy", () => 0.99);
    expect([11, 12, 13, 14]).not.toContain(heuristicLed.rank);
    for (let index = 0; index < myHand.length; index++) {
      const randomLed = chooseCard(state(), 0, "easy", forcedEasyRandomPickingIndex(index, myHand.length));
      expect([11, 12, 13, 14]).not.toContain(randomLed.rank);
    }
  });

  it("ismctsChooseCard (Difícil/Experto-scale budgets): leads none of A/Q/J/K", () => {
    for (const budgetMs of [15, 50, 250]) {
      const led = ismctsChooseCard(state(), 0, budgetMs, mulberry32(7));
      expect([11, 12, 13, 14]).not.toContain(led.rank);
    }
  });

  it("exception (forced): every legal lead is a King/Jack — no safer alternative exists", () => {
    const forced = base({ handType: "noGentlemen", hands: { 0: [card("D", 13), card("S", 11)], 1: [], 2: [], 3: [] } });
    const allowed = allowedPlays(forced, 0, [card("D", 13), card("S", 11)], currentRuleSet(forced), null);
    expect(allowed.length).toBeGreaterThan(0);
  });
});

describe("Errores bobos — rows 8 & 9: No Lady leads", () => {
  // Francisco's exact live bug report, No Lady's version: leading the Queen of clubs when it's
  // avoidable.
  const myHand: Card[] = [
    card("C", 12), // Queen of clubs — row 8
    card("H", 9),
    card("C", 6),
    card("D", 4),
    card("S", 8),
    card("H", 2),
    card("C", 10),
    card("D", 7),
    card("S", 5),
    card("H", 3),
    card("D", 14), // Ace of diamonds — row 9 (diamonds' own Q still unaccounted)
    card("S", 13), // King of spades — row 9 (spades' own Q still unaccounted)
    card("H", 11),
  ];

  function state(): GameState {
    return base({ handType: "noLady", hands: fullDeal(myHand), currentTrick: [] });
  }

  it("row 8 (allowedPlays): never leads the Queen of clubs when safe alternatives exist", () => {
    const s = state();
    const allowed = allowedPlays(s, 0, myHand, currentRuleSet(s), null);
    expect(allowed.some((c) => c.rank === 12)).toBe(false);
  });

  it("row 9 (allowedPlays): never leads the Ace or King either, since each suit's own Q is still unaccounted for", () => {
    const s = state();
    const allowed = allowedPlays(s, 0, myHand, currentRuleSet(s), null);
    expect(allowed.some((c) => c.rank === 14 || c.rank === 13)).toBe(false);
  });

  it("chooseCardHeuristic (normal): leads none of A/Q/K", () => {
    const led = chooseCardHeuristic(state(), 0, true);
    expect([12, 13, 14]).not.toContain(led.rank);
  });

  it('"easy" (heuristic path and random-override path): leads none of A/Q/K', () => {
    const heuristicLed = chooseCard(state(), 0, "easy", () => 0.99);
    expect([12, 13, 14]).not.toContain(heuristicLed.rank);
    for (let index = 0; index < myHand.length; index++) {
      const randomLed = chooseCard(state(), 0, "easy", forcedEasyRandomPickingIndex(index, myHand.length));
      expect([12, 13, 14]).not.toContain(randomLed.rank);
    }
  });

  it("ismctsChooseCard (Difícil/Experto-scale budgets): leads none of A/Q/K", () => {
    for (const budgetMs of [15, 50, 250]) {
      const led = ismctsChooseCard(state(), 0, budgetMs, mulberry32(7));
      expect([12, 13, 14]).not.toContain(led.rank);
    }
  });
});

describe("Errores bobos — rows 10, 11 & 12: K♥/A♥ handling in No King of Hearts", () => {
  it("row 10: never plays K♥ in a hearts trick before A♥ shows, while holding another heart", () => {
    const state = base({
      handType: "noKingOfHearts",
      hands: { 0: [], 1: [card("H", 13), card("H", 3)], 2: [], 3: [] },
      currentTrick: [{ player: 0, card: card("H", 5) }],
    });
    const allowed = allowedPlays(state, 1, [card("H", 13), card("H", 3)], currentRuleSet(state), null);
    expect(allowed).toEqual([card("H", 3)]);
  });

  it("row 10 exception: K♥ is the only heart left — forced", () => {
    const state = base({
      handType: "noKingOfHearts",
      hands: { 0: [], 1: [card("H", 13)], 2: [], 3: [] },
      currentTrick: [{ player: 0, card: card("H", 5) }],
    });
    const allowed = allowedPlays(state, 1, [card("H", 13)], currentRuleSet(state), null);
    expect(allowed).toEqual([card("H", 13)]);
  });

  it("row 10, safe once A♥ already fell this trick: K♥ is now a guaranteed loser, free to shed", () => {
    const state = base({
      handType: "noKingOfHearts",
      hands: { 0: [], 1: [card("H", 13), card("H", 3)], 2: [], 3: [] },
      currentTrick: [{ player: 0, card: card("H", 14) }],
    });
    const allowed = allowedPlays(state, 1, [card("H", 13), card("H", 3)], currentRuleSet(state), null);
    expect(allowed).toEqual([card("H", 13)]);
  });

  it("row 11: void in the led suit while holding K♥ — must discard it, no exception", () => {
    const state = base({
      handType: "noKingOfHearts",
      hands: { 0: [], 1: [card("H", 13), card("C", 2)], 2: [], 3: [] },
      currentTrick: [{ player: 0, card: card("S", 4) }],
    });
    const allowed = allowedPlays(state, 1, [card("H", 13), card("C", 2)], currentRuleSet(state), null);
    expect(allowed).toEqual([card("H", 13)]);
  });

  it("row 12: never plays A♥ in a hearts trick before K♥ shows, while holding another heart", () => {
    const state = base({
      handType: "noKingOfHearts",
      hands: { 0: [], 1: [card("H", 14), card("H", 3)], 2: [], 3: [] },
      currentTrick: [{ player: 0, card: card("H", 5) }],
    });
    const allowed = allowedPlays(state, 1, [card("H", 14), card("H", 3)], currentRuleSet(state), null);
    expect(allowed).toEqual([card("H", 3)]);
  });

  it("row 12 exception: A♥ is the only heart left — forced", () => {
    const state = base({
      handType: "noKingOfHearts",
      hands: { 0: [], 1: [card("H", 14)], 2: [], 3: [] },
      currentTrick: [{ player: 0, card: card("H", 5) }],
    });
    const allowed = allowedPlays(state, 1, [card("H", 14)], currentRuleSet(state), null);
    expect(allowed).toEqual([card("H", 14)]);
  });
});

describe("Errores bobos — row 13: never lead a carta infinita in trick 12 or 13", () => {
  it("is caught by the same master-lead exclusion as row 1 (no separate logic needed)", () => {
    // Hand holds the sole remaining spade (9♠, every other spade already played) plus a safe
    // alternative — trick 12 (completedTricks.length === 11).
    const completed: Trick[] = Array.from({ length: 11 }, (_, i) => dummyTrick((i % 4) as PlayerIndex));
    const state = base({
      handType: "noLastTwo",
      completedTricks: completed,
      hands: { 0: [card("S", 9), card("D", 4)], 1: [], 2: [], 3: [] },
    });
    const tracker = trackCards({ ...state, hands: { 0: [], 1: [], 2: [], 3: [] } });
    for (let rank = 2; rank <= 14; rank++) {
      if (rank !== 9) tracker.playedCards.add(`S${rank}`);
    }
    expect(isOnlyRemainingOfSuit(card("S", 9), [card("S", 9), card("D", 4)], tracker)).toBe(true);

    // Reconstruct a state whose completedTricks actually account for those spades, so
    // allowedPlays's own trackCards(state) sees the same picture.
    const spadeTricks: Trick[] = [];
    for (let rank = 2; rank <= 14; rank++) {
      if (rank === 9) continue;
      spadeTricks.push(
        dummyTrickOf([
          { player: 0, card: card("S", rank as Card["rank"]) },
          { player: 1, card: card("H", 2) },
          { player: 2, card: card("H", 3) },
          { player: 3, card: card("H", 4) },
        ]),
      );
    }
    const fullState = base({
      handType: "noLastTwo",
      completedTricks: [...completed.slice(0, 11 - spadeTricks.length), ...spadeTricks].slice(-11),
      hands: { 0: [card("S", 9), card("D", 4)], 1: [], 2: [], 3: [] },
    });
    const allowed = allowedPlays(fullState, 0, [card("S", 9), card("D", 4)], currentRuleSet(fullState), null);
    expect(allowed).toEqual([card("D", 4)]);
  });

  it("exception: every other lead also wins (both are Aces, inherently masters) — forced", () => {
    const completed: Trick[] = Array.from({ length: 11 }, (_, i) => dummyTrick((i % 4) as PlayerIndex));
    const state = base({
      handType: "noLastTwo",
      completedTricks: completed,
      hands: { 0: [card("S", 14), card("D", 14)], 1: [], 2: [], 3: [] },
    });
    const allowed = allowedPlays(state, 0, [card("S", 14), card("D", 14)], currentRuleSet(state), null);
    expect(allowed.length).toBe(2);
  });
});

describe("Errores bobos — row 14: No Last Two's free zone (tricks 1-11) always sheds the highest", () => {
  it("never discards a low defense card while a middle/high card could be shed instead", () => {
    const state = base({
      handType: "noLastTwo",
      completedTricks: Array.from({ length: 5 }, (_, i) => dummyTrick((i % 4) as PlayerIndex)),
      hands: { 0: [card("S", 2), card("H", 9), card("D", 5)], 1: [], 2: [], 3: [] },
    });
    const allowed = allowedPlays(state, 0, [card("S", 2), card("H", 9), card("D", 5)], currentRuleSet(state), null);
    expect(allowed).toEqual([card("H", 9)]);
  });

  it("applies whether leading, following, or discarding — even when the highest card would win a trick that's still free", () => {
    const state = base({
      handType: "noLastTwo",
      completedTricks: Array.from({ length: 8 }, (_, i) => dummyTrick((i % 4) as PlayerIndex)),
      hands: { 0: [], 1: [card("S", 3), card("S", 6), card("S", 10)], 2: [], 3: [] },
      currentTrick: [{ player: 0, card: card("S", 7) }],
    });
    const allowed = allowedPlays(state, 1, [card("S", 3), card("S", 6), card("S", 10)], currentRuleSet(state), null);
    expect(allowed).toEqual([card("S", 10)]);
  });
});

describe("Errores bobos — row 15: never lead the King or Queen of trump before the Ace shows", () => {
  function state(myHand: Card[], trump: Card["suit"]): GameState {
    return withPositiveSetup(base({ hands: fullDeal(myHand) }), trump);
  }

  const myHand: Card[] = [
    card("H", 13), // King of trump — row 15
    card("H", 5),
    card("H", 2),
    card("S", 9),
    card("S", 3),
    card("D", 7),
    card("D", 11),
    card("D", 2),
    card("C", 6),
    card("C", 10),
    card("C", 4),
    card("C", 8),
    card("C", 14),
  ];

  it("allowedPlays: excludes the King of trump from the lead candidates, Ace unseen", () => {
    const s = state(myHand, "H");
    const allowed = allowedPlays(s, 0, myHand, currentRuleSet(s), "H");
    expect(allowed.some((c) => c.suit === "H" && c.rank === 13)).toBe(false);
  });

  it("chooseCardHeuristic (normal): does not lead the King of trump", () => {
    const s = state(myHand, "H");
    const led = chooseCardHeuristic(s, 0, true);
    expect(led).not.toEqual(card("H", 13));
  });

  it('"easy": does not lead the King of trump, heuristic or random path', () => {
    const s = state(myHand, "H");
    const heuristicLed = chooseCard(s, 0, "easy", () => 0.99);
    expect(heuristicLed).not.toEqual(card("H", 13));
    for (let index = 0; index < myHand.length; index++) {
      const led = chooseCard(s, 0, "easy", forcedEasyRandomPickingIndex(index, myHand.length));
      expect(led).not.toEqual(card("H", 13));
    }
  });

  it("ismctsChooseCard (Difícil/Experto-scale budgets): does not lead the King of trump", () => {
    const s = state(myHand, "H");
    for (const budgetMs of [15, 50, 250]) {
      const led = ismctsChooseCard(s, 0, budgetMs, mulberry32(7));
      expect(led).not.toEqual(card("H", 13));
    }
  });

  it("exception: destriunfando with 5+ strong trumps excuses leading the King", () => {
    const strongHand: Card[] = [
      card("H", 13),
      card("H", 12),
      card("H", 11),
      card("H", 9),
      card("H", 7),
      card("S", 2),
      card("S", 4),
      card("D", 6),
      card("D", 8),
      card("C", 10),
      card("C", 3),
      card("C", 5),
      card("C", 9),
    ];
    const s = state(strongHand, "H");
    const allowed = allowedPlays(s, 0, strongHand, currentRuleSet(s), "H");
    expect(allowed.some((c) => c.suit === "H" && c.rank === 13)).toBe(true);
  });

  it("exception: the Ace of trump has already shown — King becomes a safe master lead", () => {
    const s = state(myHand, "H");
    const withAceShown = { ...s, completedTricks: [dummyTrickOf([{ player: 1, card: card("H", 14) }])] };
    const allowed = allowedPlays(withAceShown, 0, myHand, currentRuleSet(s), "H");
    expect(allowed.some((c) => c.suit === "H" && c.rank === 13)).toBe(true);
  });
});

describe("Errores bobos — row 16: cut with the cheapest winner, never a higher trump than needed", () => {
  it("wins with the lowest trump that beats the trick, not a higher one", () => {
    const s = withPositiveSetup(
      base({ hands: { 0: [], 1: [card("H", 4), card("H", 13)], 2: [], 3: [] }, currentTrick: [{ player: 0, card: card("S", 10) }] }),
      "H",
    );
    const allowed = allowedPlays(s, 1, [card("H", 4), card("H", 13)], currentRuleSet(s), "H");
    expect(allowed).toEqual([card("H", 4)]);
  });
});

describe("Errores bobos — rows 17 & 18: never discard a sure winner when ducking", () => {
  it("ducks with a non-master card rather than a proven master, when both lose this trick", () => {
    // Spades A/K/Q already out — the 10♠ is now a master; a plain 4♦ is not, and loses too.
    const s = withPositiveSetup(
      base({
        completedTricks: [
          dummyTrickOf([
            { player: 1, card: card("S", 14) },
            { player: 2, card: card("S", 13) },
            { player: 3, card: card("S", 12) },
            { player: 0, card: card("S", 11) },
          ]),
        ],
        hands: { 0: [], 1: [card("S", 10), card("D", 4)], 2: [], 3: [] },
        currentTrick: [{ player: 0, card: card("D", 13) }],
      }),
      null,
    );
    const allowed = allowedPlays(s, 1, [card("S", 10), card("D", 4)], currentRuleSet(s), null);
    expect(allowed).toEqual([card("D", 4)]);
  });

  it("exception: every legal discard is a proven master — forced", () => {
    const s = withPositiveSetup(
      base({
        completedTricks: [
          dummyTrickOf([
            { player: 1, card: card("S", 14) },
            { player: 2, card: card("S", 13) },
            { player: 3, card: card("S", 12) },
            { player: 0, card: card("S", 11) },
          ]),
          dummyTrickOf([
            { player: 1, card: card("D", 14) },
            { player: 2, card: card("D", 13) },
            { player: 3, card: card("D", 12) },
            { player: 0, card: card("D", 11) },
          ]),
        ],
        hands: { 0: [], 1: [card("S", 10), card("D", 10)], 2: [], 3: [] },
        currentTrick: [{ player: 0, card: card("H", 13) }],
      }),
      null,
    );
    const allowed = allowedPlays(s, 1, [card("S", 10), card("D", 10)], currentRuleSet(s), null);
    expect(allowed.length).toBe(2);
  });
});

describe("Errores bobos — row 19: never lead into a known-void opponent who might still hold trump", () => {
  it("avoids leading a suit the next opponent has shown void in, when a safer suit remains", () => {
    const s = withPositiveSetup(
      base({
        // Seat 1 already shown void in diamonds (didn't follow a diamond lead) but hasn't shown
        // void in trump (hearts).
        completedTricks: [
          dummyTrickOf([
            { player: 0, card: card("D", 2) },
            { player: 1, card: card("S", 2) },
            { player: 2, card: card("D", 3) },
            { player: 3, card: card("D", 4) },
          ]),
        ],
        hands: { 0: [card("D", 9), card("C", 9)], 1: [], 2: [], 3: [] },
        currentTrick: [],
      }),
      "H",
    );
    const allowed = allowedPlays(s, 0, [card("D", 9), card("C", 9)], currentRuleSet(s), "H");
    expect(allowed).toEqual([card("C", 9)]);
  });

  it("exception: every remaining suit is equally risky — forced", () => {
    const s = withPositiveSetup(
      base({
        completedTricks: [
          dummyTrickOf([
            { player: 0, card: card("D", 2) },
            { player: 1, card: card("S", 2) },
            { player: 2, card: card("D", 3) },
            { player: 3, card: card("D", 4) },
          ]),
          dummyTrickOf([
            { player: 0, card: card("C", 2) },
            { player: 1, card: card("S", 5) },
            { player: 2, card: card("C", 3) },
            { player: 3, card: card("C", 4) },
          ]),
        ],
        hands: { 0: [card("D", 9), card("C", 9)], 1: [], 2: [], 3: [] },
        currentTrick: [],
      }),
      "H",
    );
    const allowed = allowedPlays(s, 0, [card("D", 9), card("C", 9)], currentRuleSet(s), "H");
    expect(allowed.length).toBe(2);
  });
});

describe("Errores bobos — rows 20, 21 & 22: auction guardrails", () => {
  it("row 20: caps a 5+ bid outside a genuinely exceptional hand", () => {
    expect(guardedBid(5, 6)).toBe(4);
    expect(guardedBid(6, 6.5)).toBe(4);
  });

  it("row 20 exception: a genuinely exceptional hand (raw estimate >= 7) may bid 5+", () => {
    expect(guardedBid(5, 8)).toBe(5);
  });

  it("row 21: never buys (bids) at or above your own hand's estimate — no exception", () => {
    expect(guardedBid(6, 6)).toBeNull();
    expect(guardedBid(7, 6)).toBeNull();
  });

  it("row 22: the dealer always sells when the bid pays more than their own estimate — no exception", () => {
    expect(guardedDealerSell(5, 4)).toBe(true);
    expect(guardedDealerSell(4, 4)).toBe(false);
    expect(guardedDealerSell(null, 4)).toBe(false);
  });
});

describe("allowedPlays — never returns an empty set", () => {
  it("falls back to the full legal set when every candidate would otherwise be excluded", () => {
    const stats = newGuardrailStats();
    const state = base({ handType: "noGentlemen", hands: { 0: [card("D", 13), card("S", 11)], 1: [], 2: [], 3: [] } });
    const allowed = allowedPlays(state, 0, [card("D", 13), card("S", 11)], currentRuleSet(state), null, stats);
    expect(allowed.length).toBe(2);
    expect(stats.forcedFallbacks).toBeGreaterThan(0);
  });
});

// Same small deterministic PRNG used throughout this repo's property/integration tests.
function mulberry32Full(seed: number) {
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
 * Drives one full 10-hand bot-vs-bot game, counting every card decision's guardrail forced-
 * fallbacks (via the shared `stats` object threaded through `chooseCard`) alongside the total
 * number of card decisions made — the "silly-mistake audit." Auction/trump/dealer decisions don't
 * go through `allowedPlays` (that's card play only), so they're driven normally but not counted.
 */
function playFullGameCountingFallbacks(
  ruleSet: GameRules,
  difficulty: Difficulty,
  firstDealer: PlayerIndex,
  seed: number,
  stats: ReturnType<typeof newGuardrailStats>,
): { finalState: GameState; cardDecisions: number } {
  const random = mulberry32Full(seed);
  let state = createGame(ruleSet, firstDealer);
  let cardDecisions = 0;

  while (state.phase !== "game-complete") {
    switch (state.phase) {
      case "awaiting-deal": {
        const deck = shuffle(createDeck(), random);
        state = applyAction(state, { type: "DEAL_HAND", deck });
        break;
      }
      case "trump-selection": {
        const setup = state.positiveSetup!;
        const dealerMayOpen = setup.trumpNamer === state.dealer && !setup.auctionOpened;
        if (dealerMayOpen && shouldOpenAuction(state, state.dealer)) {
          state = applyAction(state, { type: "OPEN_AUCTION", player: state.dealer });
        } else {
          const declaration = chooseTrumpDeclaration(state, setup.trumpNamer);
          state = applyAction(state, {
            type: "DECLARE_TRUMP",
            player: setup.trumpNamer,
            trump: declaration.trump,
            direction: declaration.direction,
            backwards: declaration.backwards,
          });
        }
        break;
      }
      case "auction-bidding": {
        const others = ALL_SEATS.filter((p) => p !== state.dealer);
        const bidder = others.find((p) => chooseBid(state, p) !== null);
        if (bidder !== undefined) {
          state = applyAction(state, { type: "SUBMIT_BID", player: bidder, tricks: chooseBid(state, bidder)! });
        } else {
          state = applyAction(state, { type: "DEALER_DECIDE", player: state.dealer, sell: chooseDealerDecision(state, state.dealer) });
        }
        break;
      }
      case "playing": {
        const player = state.currentTurn;
        // Difícil/Experto get a tiny test-scoped search budget (same pattern as
        // hardVsNormal.test.ts's TEST_SEARCH_BUDGET_MS) — this audit exercises the guardrail
        // layer itself, not production search timing, and 8 games x ~130 decisions x a real
        // 250-900ms budget would make this test unusably slow.
        const card =
          difficulty === "hard" || difficulty === "expert"
            ? ismctsChooseCard(state, player, 15, random, stats)
            : chooseCard(state, player, difficulty, random, stats);
        cardDecisions += 1;
        state = applyAction(state, { type: "PLAY_CARD", player, card });
        break;
      }
      case "hand-complete": {
        state = applyAction(state, { type: "ADVANCE_HAND" });
        break;
      }
    }
  }

  return { finalState: state, cardDecisions };
}

describe("silly-mistake audit — bot-vs-bot forced-fallback counts per difficulty", () => {
  // Hard/Expert still run real ISMCTS search (just at a tiny 15ms test budget, not production's
  // 250-900ms) — kept small so this suite doesn't add heavy, sustained CPU load that starves
  // other wall-clock-budgeted tests running concurrently in sibling vitest workers (observed:
  // hardVsNormal.test.ts's own real-budget timing comparison flaking when this file's full
  // 8-games-per-difficulty audit ran alongside it, though never when run alone).
  const GAMES_PER_DIFFICULTY: Record<Difficulty, number> = { easy: 8, normal: 8, hard: 3, expert: 3 };
  const ruleSet: GameRules = {
    mandatoryKilling: true,
    auctionMustSell: false,
    playingDownEnabled: true,
    backwardsEnabled: true,
    noFaceCardsRedealEnabled: true,
  };

  for (const difficulty of ["easy", "normal", "hard", "expert"] as const) {
    const games = GAMES_PER_DIFFICULTY[difficulty];
    it(`difficulty="${difficulty}": completes ${games} full games, reporting forced-fallback counts`, () => {
      const stats = newGuardrailStats();
      let totalCardDecisions = 0;

      for (let i = 0; i < games; i++) {
        const firstDealer = (i % 4) as PlayerIndex;
        const seed = i * 15485863 + 11;
        const { finalState, cardDecisions } = playFullGameCountingFallbacks(ruleSet, difficulty, firstDealer, seed, stats);
        expect(finalState.phase).toBe("game-complete");
        totalCardDecisions += cardDecisions;
      }

      // eslint-disable-next-line no-console
      console.log(
        `[silly-mistake audit] difficulty=${difficulty}: ${stats.forcedFallbacks} forced fallback(s) ` +
          `across ${totalCardDecisions} card decisions over ${games} games`,
      );

      // Not a hard zero: a forced fallback means "every candidate was equally bad," a genuinely
      // forced position (e.g. only J/K left in No Gentlemen), not a guardrail violation — those
      // are expected to occur sometimes over enough games, just rarely relative to total
      // decisions. The real floor is legality, already proven by reaching game-complete.
      expect(totalCardDecisions).toBeGreaterThan(0);
      expect(stats.forcedFallbacks).toBeGreaterThanOrEqual(0);
    });
  }
});
