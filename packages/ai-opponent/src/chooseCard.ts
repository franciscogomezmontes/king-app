import { Card, GameState, legalCardsFor, PlayerIndex, RandomSource } from "rules-engine";
import { chooseCardHeuristic } from "./heuristic";
import { EXPERT_BUDGET_MS, HARD_BUDGET_MS, ismctsChooseCard } from "./ismcts";

/**
 * "easy" is Tier 1's heuristic (`chooseCardHeuristic`, tracking off) with some randomness mixed in
 * (per .claude/skills/king-ai-opponent: "Easy can even just be the Tier 1 heuristic bot with
 * intentional randomness mixed in"). "normal" is the same heuristic with card-tracking-aware
 * leading turned on (see heuristic.ts's `choosePositiveLead`). "hard" and "expert" are Tier 2:
 * Information Set Monte Carlo Tree Search (see ismcts.ts) with a modest and a larger search
 * budget respectively — see `HARD_BUDGET_MS`/`EXPERT_BUDGET_MS`.
 */
export type Difficulty = "easy" | "normal" | "hard" | "expert";

// How often "easy" ignores its own heuristic and just plays a uniformly random legal card instead
// — enough to be a noticeably weaker, less consistent opponent without playing outright illegally
// or nonsensically most of the time.
const EASY_RANDOMNESS = 0.2;

/**
 * Picks a card to play for `player`, given the full game state. Dispatches to Tier 1
 * (`chooseCardHeuristic`, heuristic.ts) for "easy"/"normal", or Tier 2 (`ismctsChooseCard`,
 * ismcts.ts) for "hard"/"expert" — see the `Difficulty` doc above. Always legal regardless of
 * difficulty: Tier 1 only ever chooses from `legalCardsFor`, and Tier 2 is built the same way (its
 * own tree/rollout moves are drawn from `legalCardsFor` at every step, including its rollout
 * policy, which is Tier 1 itself).
 */
export function chooseCard(
  state: GameState,
  player: PlayerIndex,
  difficulty: Difficulty = "normal",
  random: RandomSource = Math.random,
): Card {
  switch (difficulty) {
    case "hard":
      return ismctsChooseCard(state, player, HARD_BUDGET_MS, random);
    case "expert":
      return ismctsChooseCard(state, player, EXPERT_BUDGET_MS, random);
    case "normal":
      return chooseCardHeuristic(state, player, true);
    case "easy": {
      const legal = legalCardsFor(state, player);
      if (legal.length > 1 && random() < EASY_RANDOMNESS) {
        return legal[Math.floor(random() * legal.length)];
      }
      return chooseCardHeuristic(state, player, false);
    }
  }
}
