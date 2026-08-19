---
name: king-rules-engine
description: Use this skill when implementing or changing King's game rules, hand scoring, trick resolution, or alternative-rule (RuleSet) toggles inside packages/rules-engine. Triggers on requests to add/modify a hand type, scoring formula, follow-suit legality, trump/auction logic, or any alt-rule toggle (Mandatory Killing, Auction Must Sell, Playing Up/Down, Backwards, or new candidates). Also use when debugging a scoring or zero-sum bug.
---

# King rules engine

Guidance for correctly implementing and safely changing the rules engine — the single most
important piece of this app. A scoring bug is the one bug players will actually notice and stop
trusting the app over.

## Ground truth (memorize before touching scoring code)

4 players, 52 cards, 13 each, aces high, no trumps in negative hands.

Negative hands, in order, penalty per capture: No Tricks −20/trick · No Hearts −20/heart ·
No Gentlemen (K/J) −30/card · No Lady (Q) −50/card · No King of Hearts −160 flat · No Last Two
Tricks −90 each of the last two tricks. Sum across all 4 players across all 6 hands: **exactly
−1,300**. In the Hearts and King-of-Hearts hands, a player leading may only lead a heart if hearts
is the only suit left in their hand.

Positive hands: dealer names trump / no-trump, or auctions the choice (bid = number of tricks;
winner names trump, their bid is transferred from their trick count to the dealer's at scoring
time). Default scoring +25/trick. Sum across all 4 players across all 4 hands: **exactly +1,300**.

Whole game sums to **exactly 0**. This is the single invariant every change must preserve.

## Before writing any scoring/logic change

1. Locate (or write) the property-based test that asserts the zero-sum invariant for the hand
   type or `RuleSet` combination you're touching. If it doesn't exist yet, write it first.
2. Express the change as data, not a branch: new alt-rules extend the `RuleSet` type and are
   consumed by existing scoring/legality functions via config, not `if (ruleSet.name === 'colombia')`
   style special-casing.
3. Confirm follow-suit legality and trump/void handling are unaffected unless that's explicitly
   what you're changing — these are shared across every hand type.

## Implementation checklist

- [ ] Change is isolated to `packages/rules-engine` (or `ai-opponent` if it's bot strategy, never
      UI code) — game logic never lives in a component.
- [ ] `RuleSet` config typed and documented; default value matches current behavior (no silent
      behavior change when a new toggle is added but left off).
- [ ] Unit tests for the specific hand/rule.
- [ ] Property test: zero-sum holds across a representative sweep of `RuleSet` combinations,
      not just defaults.
- [ ] If the change affects leading/following legality, test the "must lead X unless void"
      edge cases explicitly (these are where King rules implementations most often get subtly
      wrong versus similar games like Hearts or Barbu).
- [ ] Run the full rules-engine test suite, not just the new tests, before calling it done —
      scoring changes have a habit of breaking hands you didn't think you touched.

## When adding a candidate alternative rule from research

Check the Notion "Game Research & Rule Comparisons" page (or the project's research doc) for the
rule's description and source game before implementing — don't invent behavior from the name
alone. Confirm with the user how it should interact with zero-sum scoring before writing code if
it's not obvious (e.g. a "shoot the moon" style reversal needs an explicit decision on how the
reversed penalty is redistributed to still net to the hand's fixed total).

## Common pitfalls in this specific game

- Confusing "No Gentlemen" (kings AND jacks, 8 cards, −30 each) with a kings-only or jacks-only
  rule — it's both ranks together.
- Forgetting the auction bid transfer: if the dealer auctions off trump-naming rights, the winning
  bid's trick count moves from the bidder's total to the dealer's before scoring, it does not just
  determine who names trump.
- Applying "Playing Down"'s −75/trick against the *wrong* starting baseline — each player starts
  that hand at 325, not the table starts at 325 total.
- Treating "Backwards" as a trump/no-trump choice — it's an independent toggle on top of whatever
  trump decision was already made.
- Mandatory Killing's "beat"/"trump if able" must be judged against the trick's actual current
  winner (`legality.ts`'s `wouldBeat`), not just "holds a higher card of the led suit" or "holds
  any trump." This is one rule with two symmetric failure modes, both caught live by Francisco
  playing real hands, months apart: (1) a led-suit follower forced to play a needlessly high card
  of the led suit even though a trump already thrown earlier in the trick had already made that
  card unable to win regardless of rank; (2) a player void in the led suit forced to throw away a
  low trump even though every trump they hold is *lower* than a trump an earlier player already
  threw, so none of them could actually "kill" anything either. Both branches of `legalPlays` now
  route through the same `wouldBeat` check — see its regression tests in `legality.test.ts` for
  the exact hands that caught each one. If you touch either branch again, re-verify both
  directions, not just the one you're changing.
