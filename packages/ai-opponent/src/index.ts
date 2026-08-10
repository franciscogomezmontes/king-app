import { Card } from "rules-engine";

/**
 * Placeholder for the Tier 1 heuristic bot (see .claude/skills/king-ai-opponent).
 * Phase 4 (Solo vs. Computer) in the Notion project plan implements this for real, per hand
 * type. For now this just proves the workspace wiring to `rules-engine` works end to end.
 */
export function chooseCard(legalCards: Card[]): Card {
  if (legalCards.length === 0) {
    throw new Error("chooseCard() called with no legal cards");
  }
  // TODO(Phase 4): replace with per-hand-type heuristics per king-ai-opponent skill.
  return legalCards[0];
}
