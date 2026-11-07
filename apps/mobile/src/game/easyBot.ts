import { guardedBid, guardedDealerSell } from "ai-opponent";
import { Card, GameState, highestBid, PlayerIndex, RandomSource, TrumpSuit } from "rules-engine";

/**
 * The "Easy" difficulty's trump/bidding/dealer decisions. Card play itself no longer lives here —
 * it goes through ai-opponent's own `chooseCard(state, player, "easy", random)` instead (today's
 * heuristic plus some randomness), so the two difficulties are distinguishable in more than just
 * these four decisions. Same `(state, player) -> decision` shape as ai-opponent's functions so the
 * store can treat both difficulties uniformly. `random` is an injectable `RandomSource` (mirrors
 * rules-engine's `shuffle(deck, random)`), defaulting to `Math.random`, so tests can seed it for
 * reproducibility.
 *
 * Trump declaration stays uniform-random (no "Errores bobos" row governs *which* trump a weak
 * player picks, only how they bid/sell/buy around it) — the auction decisions below, however, are
 * no longer uniformly random: every difficulty's auction must respect the same shared guardrails
 * (`guardedBid`/`guardedDealerSell`, ai-opponent's guardrails.ts — "Errores bobos" rows 20-22), so
 * Easy gets a simple Ace/King-count hand estimate (deliberately cruder than `estimateTricks`'s
 * full quick-tricks model — Normal and above already own that one) to feed the same guardrails,
 * plus a little randomness among whatever the guardrails leave as sensible, never a flat coin
 * flip that could offer an absurd bid or decline a clearly-profitable sale.
 */

function pick<T>(options: T[], random: RandomSource): T {
  return options[Math.floor(random() * options.length)];
}

/** Parámetros sheet: "Valor As ≈ 1 baza; Valor K ≈ 0,5-0,75". A deliberately simple, suit-blind
 * count (no quick-tricks pairing, no length bonus) — Easy's own cruder estimate, distinct from
 * `estimateTricks` (Normal/Difícil/Experto's shared formula). */
function simpleHandEstimate(hand: Card[]): number {
  let total = 0;
  for (const card of hand) {
    if (card.rank === 14) total += 1;
    else if (card.rank === 13) total += 0.5;
  }
  return Math.round(total);
}

export function shouldOpenAuction(state: GameState, dealer: PlayerIndex, random: RandomSource = Math.random): boolean {
  const estimate = simpleHandEstimate(state.hands[dealer]);
  // Opening is a free option (the dealer can always decline every bid and fall back to naming
  // trump themselves) — a weak hand should open readily, a strong one rarely, with some
  // randomness either way rather than a hard cutoff.
  return random() < (estimate >= 5 ? 0.15 : 0.7);
}

export interface TrumpDeclaration {
  trump: TrumpSuit;
  direction: "up" | "down";
  backwards: boolean;
}

const TRUMP_OPTIONS: TrumpSuit[] = [null, "S", "H", "D", "C"];

export function chooseTrumpDeclaration(
  state: GameState,
  _trumpNamer: PlayerIndex,
  random: RandomSource = Math.random,
): TrumpDeclaration {
  return {
    trump: pick(TRUMP_OPTIONS, random),
    direction: state.ruleSet.playingDownEnabled && random() < 0.5 ? "down" : "up",
    backwards: state.ruleSet.backwardsEnabled && random() < 0.5,
  };
}

/**
 * Bids (or passes) using the simple Ace/King estimate above, run through the same `guardedBid`
 * every difficulty's bid must pass — "Errores bobos" rows 20 (never 5+ outside an exceptional
 * hand) and 21 (never bid at or above your own estimate). The only randomness left is *whether*
 * to bid at all when a sensible one is available — never a bid amount the guardrail would reject.
 */
export function chooseBid(state: GameState, bidder: PlayerIndex, random: RandomSource = Math.random): number | null {
  const estimate = simpleHandEstimate(state.hands[bidder]);
  const currentHigh = highestBid(state.positiveSetup?.bids ?? [])?.tricks ?? 0;
  if (random() < 0.3) return null; // a little randomness among sensible options: sometimes passes anyway
  return guardedBid(currentHigh + 1, estimate);
}

/**
 * Sells whenever `guardedDealerSell` (row 22 — "Ninguna" exception, an absolute floor) says the
 * bid pays more than the dealer's own simple estimate would. No randomness here: unlike opening
 * or bidding, this specific row has no stated exception for any difficulty to exercise.
 */
export function chooseDealerDecision(state: GameState, dealer: PlayerIndex, _random: RandomSource = Math.random): boolean {
  const top = highestBid(state.positiveSetup?.bids ?? []);
  return guardedDealerSell(top?.tricks ?? null, simpleHandEstimate(state.hands[dealer]));
}
