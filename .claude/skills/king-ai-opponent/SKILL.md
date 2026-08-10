---
name: king-ai-opponent
description: Use this skill when designing or implementing computer-player logic in packages/ai-opponent — card selection heuristics, difficulty levels, or the ISMCTS upgrade path for the Solo vs. Computer mode. Triggers on requests about AI bot strategy, computer player difficulty, or making the AI play a specific hand type well.
---

# King AI opponent

Guidance for building the computer players for Solo vs. Computer mode (Notion project plan phase
4). Two-tier approach: ship a heuristic bot first, upgrade to search-based play later.

## Tier 1 — heuristic bot (ship this first)

The bot must always produce a *legal* move via `packages/rules-engine`'s legality functions —
never hand-roll legality inside the bot. On top of legality, apply simple per-hand-type heuristics:

- **Negative hands (avoid capturing):** when void in the led suit, discard the highest/most
  dangerous card of a penalty category first (e.g. dump high hearts early in No Hearts, dump K♥
  as early as legally possible in No King of Hearts once forced to touch hearts). When forced to
  follow suit and must contribute to a trick, prefer the lowest card that still avoids winning the
  trick if any safe option exists.
- **No Last Two Tricks specifically:** track trick count remaining; bias toward not winning tricks
  12 and 13 in particular, which requires the bot to reason about trick-count, not just card rank.
- **Positive hands (win tricks):** prefer winning with the lowest card that still wins, preserve
  high trumps for later tricks, count void suits in opponents (from earlier discards) to judge
  when a trump will definitely win.
- **Auction bidding (if bot is asked to bid):** estimate expected tricks from hand strength (high
  cards + likely trump length) rather than bidding randomly; keep it simple and tunable rather than
  "optimal" for v1.
- This tier should be good enough to ship as a real Phase 4 release — don't block launch on Tier 2.

## Tier 2 — Information Set Monte Carlo Tree Search (ISMCTS)

The standard technique for imperfect-information trick-taking games (the bot doesn't know the
other three hands). At decision time: sample plausible deals of the unseen cards consistent with
what's been played/discarded so far (respecting known voids), run tree search/playouts on each
sampled deal using the heuristic bot (or a simpler rollout policy) as the playout policy, aggregate
results across samples to pick a move.

- Difficulty levels = search budget (iterations or time cap), not a different algorithm — "Easy"
  can even just be the Tier 1 heuristic bot with intentional randomness mixed in.
- Keep ISMCTS bot logic in `packages/ai-opponent`, sharing the same legality/scoring calls into
  `rules-engine` as Tier 1 — never let the bot's internal simulation diverge from the real engine's
  rules, or it will "cheat" by reasoning about illegal lines.

## Testing an AI change

- Regression-test against known hands: given a fixed hand + trick history, assert the bot's chosen
  move is legal and matches the intended heuristic category (e.g. "discards a heart when void and
  in the No Hearts hand"), not necessarily an exact single "correct" move — trick-taking often has
  more than one reasonable play.
- For any change, sanity-run full games bot-vs-bot and confirm the game still resolves to a valid
  zero-sum final score (this exercises the rules-engine integration, not just the heuristic).
