import { GameState, highestBid, PlayerIndex, RandomSource, TrumpSuit } from "rules-engine";

/**
 * The "Easy" difficulty's bidding/trump/dealer decisions: uniform-random picks, everywhere. Card
 * play itself no longer lives here — it goes through ai-opponent's own `chooseCard(state, player,
 * "easy", random)` instead (today's heuristic plus some randomness), so the two difficulties are
 * distinguishable in more than just these four decisions. Same `(state, player) -> decision`
 * shape as ai-opponent's functions so the store can treat both difficulties uniformly. `random` is
 * an injectable `RandomSource` (mirrors rules-engine's `shuffle(deck, random)`), defaulting to
 * `Math.random`, so tests can seed it for reproducibility.
 */

function pick<T>(options: T[], random: RandomSource): T {
  return options[Math.floor(random() * options.length)];
}

export function shouldOpenAuction(_state: GameState, _dealer: PlayerIndex, random: RandomSource = Math.random): boolean {
  return random() < 0.5;
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

export function chooseBid(state: GameState, _bidder: PlayerIndex, random: RandomSource = Math.random): number | null {
  const currentHigh = highestBid(state.positiveSetup?.bids ?? [])?.tricks ?? 0;
  if (currentHigh >= 13 || random() < 0.5) return null;
  return currentHigh + 1 + Math.floor(random() * (13 - currentHigh));
}

export function chooseDealerDecision(
  _state: GameState,
  _dealer: PlayerIndex,
  random: RandomSource = Math.random,
): boolean {
  return random() < 0.5;
}
