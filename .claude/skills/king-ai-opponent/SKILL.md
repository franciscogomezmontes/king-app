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

- **Negative hands (avoid capturing):** whenever a card is available that's already guaranteed not
  to win the current trick — whether that's a void discard or ducking under while following suit,
  the two are treated identically (see `mostDangerous` below) — discard the highest/most dangerous
  card of the hand's penalty category first (e.g. dump high hearts early in No Hearts, dump K♥ as
  early as legally possible in No King of Hearts once forced to touch hearts), rather than
  hoarding it and hoping for another safe window later. When forced to actually win a trick (every
  legal card would), play the lowest of them — least-bad option, not a discard decision anymore.
- **No Last Two Tricks specifically:** track trick count remaining; bias toward not winning tricks
  12 and 13 in particular, which requires the bot to reason about trick-count, not just card rank.
- **Positive hands (win tricks):** prefer winning with the lowest card that still wins, preserve
  high trumps for later tricks, count void suits in opponents (from earlier discards) to judge
  when a trump will definitely win.
- **Auction bidding (if bot is asked to bid):** estimate expected tricks from hand strength (high
  cards + likely trump length) rather than bidding randomly; keep it simple and tunable rather than
  "optimal" for v1.
- This tier should be good enough to ship as a real Phase 4 release — don't block launch on Tier 2.

**`estimateTricks` (`handStrength.ts`) — calibrated against real-table norms, not a flat point
average.** Shared by `shouldOpenAuction`, `chooseBid`, and `chooseDealerDecision` — all three call
this one function, so they're automatically consistent with each other (a dealer's "should I sell"
call and a bidder's "what should I bid" call always agree on what a hand is worth). The original
version (`points / 3`, Ace=4/King=3/Queen=2/Jack=1) routinely produced bids of 5 — direct
playtesting (not just bot-vs-bot simulation) caught this as unrealistic: at this family's table,
offering 3 tricks is already a strong bid, 4 is rare, 5+ is essentially never seen outside a truly
exceptional hand. Replaced with a suit-by-suit "quick tricks" model (the standard trick-taking
convention: only Ace/King-headed holdings count — `AK`=2, `AQ`=1.25, bare `A`=1, `KQ`=0.75, backed
`K`=0.4, everything headed by Q/J or lower=0) plus a length bonus for a genuinely long suit that's
also headed by real strength (`LENGTH_BONUS_MIN_LENGTH`=6+ cards, `LENGTH_BONUS_PER_EXTRA_CARD`=0.4
each beyond that — an unheaded long suit of low cards won't establish itself before the hand's
over, so it earns nothing). All weights are tunable, but re-run `handStrength.test.ts` after
changing them — it deals hundreds of real 13-card hands and asserts the resulting bid distribution
against those same norms (4+ under 15% of hands, 5+ under 3%) directly, rather than trusting the
formula by inspection.

**Trump is a reserve, not just another suit — `choosePositiveLead`'s trump-length branch
(`heuristic.ts`).** Direct playtesting caught the bot proactively leading a decent-but-unproven
trump holding (e.g. the King of trump with the Ace still unseen) far too readily. The branch that
leads trump to draw opponents out without a proven master now only fires at
`TRUMP_LEAD_CONTROL_LENGTH` (5+) — well above the ~3.25-per-suit average across 4 hands, meaning
the other three players combined hold at most 8 — not the old 3+, which was barely above average
and not real control. Below that bar, trump is held in reserve rather than spent recklessly. This
also closes a related leak in the generic "safest available lead" fallback below it: that fallback
picks purely by suit length/void count and doesn't know about trump at all, so on a merely-decent
trump holding it would happen to re-select trump anyway whenever trump was incidentally the
hand's longest suit — defeating the whole point of the length-control branch above it. The fallback
now excludes trump from that comparison entirely, only leading it if trump is the only suit left in
hand (a genuinely forced position). See `chooseCard.test.ts`'s regression tests for the exact
King-length-3 scenario this fixes and the length-5+ case that should still lead trump.

**Negative-hand discards: `mostDangerous` applies whenever a nonWinner is available, not just on
void discards.** A card that currently doesn't win the trick (`nonWinners`) is a permanently safe
fact — its rank can't retroactively change, and being already-beaten by an earlier play never gets
undone — so it's a genuinely zero-cost moment to shed the hand type's specific danger category
(e.g. the Queen under an Ace in No Queens), not just when void in the led suit. Both the
void-discard case and the following-suit "duck under" case now route through the same
`mostDangerous(nonWinners, handType, backwards)` call — a single unified rule instead of two
different ones for what's actually the same situation. `mostDangerous` itself gained a tie-break:
when nothing in the candidate set matches the hand type's danger category (`dangerScore` ties at 0
for everyone — e.g. following a spade lead in No Queens with no queens among the legal spades), it
now falls back to the lowest-ranked card rather than an arbitrary array-order pick, so it never does
worse than the old plain `lowestCard` behavior when there's no real signal to act on.

**Negative-hand leads never spend a proven master for nothing — `nonDominatedLeads`
(`cardTracker.ts`).** A card that's already the guaranteed highest remaining of its suit
(`isMasterCard`) is mathematically certain to win its own trick when led into an empty trick, since
a negative hand never has trump to create any chance of it being beaten. Leading one is never
correct except when every legal lead is equally dominated (a genuinely forced position). This was
caught live at Experto: with zero clubs played and the bot holding the entire top of the club suit
itself (A/K/Q), ISMCTS still led the Queen of Clubs — a provably dominated move that a real player
would reject instantly, but that a modest search budget (250-900ms) spread across a wide branching
factor (11-13 legal leads this early) can end up under-sampling and never correcting, especially
early in a hand when there's the least information and the most options. `nonDominatedLeads(legal,
hand, tracker)` filters these out structurally, before the search (or the Tier 1 heuristic) ever
has to rediscover the fact by sampling or luck. Applied in two places, so both tiers share the same
domain fact: `chooseCardHeuristic`'s own negative-hand lead branch (almost always a no-op there,
since "lead lowest" rarely happens to be a master anyway, but now explicit and shared rather than
incidental), and `ismctsChooseCard`'s root candidate set specifically (`runIteration`'s
`rootCandidates` parameter — restricted only at `node === root`, i.e. the actual decision being
searched; every deeper node in the tree, and every rollout decision via `chooseCardHeuristic`, is
unaffected). See `chooseCard.test.ts`'s regression test, which checks both tiers against the same
scenario.

Regression-test cadence for all four fixes above: `hardVsNormal.test.ts` and
`difficultyComparison.test.ts` re-verify the "better tier wins" invariant after each one — the
specific margins shift as the heuristic/search get stronger, but the direction (Normal beats the
old pre-tracking heuristic; Hard beats Normal) must keep holding. Re-run both after touching any of
`handStrength.ts`, `heuristic.ts`, `cardTracker.ts`, or `ismcts.ts`.

## Tier 2 — Information Set Monte Carlo Tree Search (ISMCTS)

Implemented in `packages/ai-opponent/src/ismcts.ts`, backing `chooseCard`'s "hard" (Difícil) and
"expert" (Experto) difficulties — see `chooseCard.ts`'s dispatcher. `chooseCard(state, player,
difficulty)`'s public signature never changed; only the internal dispatch grew two more branches.

**Why Tier 1 moved to its own file.** `heuristic.ts` holds what used to live directly in
`chooseCard.ts` (`chooseCardHeuristic`, renamed from the old private `chooseCardCore`) — pulled out
so `ismcts.ts` could import it as its rollout policy without a circular dependency (`chooseCard.ts`
already needs to import `ismcts.ts` to dispatch "hard"/"expert" to it). The logic itself is
untouched, just relocated.

**Determinization** (`determinizeHands`, same file): samples one plausible full deal of every card
the searching player can't already see, using only public information — `cardTracker.ts`'s
`voidSuits` (never lead a determinized opponent hand a card of a suit they've already shown void
in) and each opponent's known remaining card *count* (`state.hands[opponent].length` — always
visible at a real table, just not *which* cards). Never reads the actual contents of another
player's hand; that would defeat the entire point of determinizing in the first place. Deals
"most-constrained-first" (cards of a suit voided by more opponents go first, since they have fewer
legal homes) to minimize how often a single pass paints itself into a corner; a failed attempt
just reshuffles and retries, and the last of a bounded number of attempts relaxes voids entirely
rather than ever throwing — a slightly-wrong determinization beats a bot that crashes.

**Search** (`ismctsChooseCard`): one shared tree per decision (not one tree per determinization —
that's the "IS" in ISMCTS). Each iteration: fresh determinization, select/expand down the tree via
UCB1 until an untried action is found, expand exactly one new node there, then **roll out the rest
of the hand using `chooseCardHeuristic` (Tier 1, tracking on) for every seat** — reusing the real
Tier 1 policy instead of writing a second, weaker one just for rollouts. The leaf reward is read
directly off the resulting `GameState.handHistory[...].scores[player]` — i.e. the actual
`scoreNegativeHand`/`scorePositiveHand` output for that hand type, not a proxy like "tricks won."
This matters concretely: `noKingOfHearts` is one flat -160 swing on a single card, `noHearts` is
-20 per heart captured — a proxy metric can't tell those apart, real scoring can.

UCB1 selection normalizes reward to `[0, 1]` per search using the min/max reward actually observed
so far, since raw score deltas span wildly different ranges by hand type (a positive hand's per-
trick payout looks nothing like `noKingOfHearts`'s single -160). ISMCTS's own correction over plain
UCB1 — a node's `availability` count, not the parent's `visits` — feeds the exploration term,
since an action isn't a candidate in every determinization (it might not be legal in that sampled
world).

Root move selection: **best average reward** (`totalReward / visits`) among the root's actually-
visited children, not the more common "most-visited child" (which trades off differently and isn't
what was asked for here). If the budget expires before a single iteration completes (a near-zero
budget), falls back to the plain Tier 1 heuristic rather than returning nothing.

**Legality is structural, not checked after the fact**: every action considered anywhere in the
search — tree selection/expansion *and* rollout — comes from `legalCardsFor` (directly, or via
`chooseCardHeuristic`, which itself only ever chooses from `legalCardsFor`). There's no separate
legality check layered on top because there's nothing for it to catch.

**Tunables** (`ismcts.ts`, documented the same way as `AUCTION_THRESHOLD`/`MIN_TRUMP_SUIT_LENGTH`):
- `HARD_BUDGET_MS` (Difícil) — a modest budget targeting ~150-300ms per decision on a mid-range
  phone.
- `EXPERT_BUDGET_MS` (Experto) — a deliberately larger budget for a noticeably stronger, slower
  opponent.
- `UCB1_EXPLORATION` — the exploration/exploitation balance against normalized-`[0,1]` reward;
  0.7 was chosen empirically for the small-budget regime this bot runs under (the textbook
  `sqrt(2)`, calibrated for the general bounded-reward case, tends to over-explore here).
- `MAX_DETERMINIZE_ATTEMPTS` (in `determinizeHands`) — how many times a failed most-constrained-
  first deal gets reshuffled and retried before the final, void-relaxed fallback attempt.

**Performance — this runs synchronously on the JS thread, with no yield points inside the search
loop.** That's a deliberate choice per this skill's own "ship the synchronous version first and
measure" principle, but it has a real consequence worth stating plainly: a "hard"/"expert" decision
*will* block the JS thread (and therefore UI rendering/input) for the full budget — up to
`HARD_BUDGET_MS` or `EXPERT_BUDGET_MS` — every single time that bot plays a card. This is a
structural fact of a tight `while (Date.now() < deadline)` loop with no `await`/yield inside it, not
something that needs re-verifying per change. If a future session wires "hard"/"expert" into the
real UI and this jank is unacceptable, the fix is moving the search off the JS thread (a Web Worker
on web; a native module or JSI approach on mobile) — don't build that machinery pre-emptively; only
reach for it once the synchronous version is actually in front of players and the jank is a
confirmed, not just anticipated, problem.

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
- A difficulty upgrade isn't proven by "doesn't crash" alone — back it with a same-seed paired
  comparison (identical deals for both difficulties, only the difficulty under test changed) over
  enough hands/games that the margin is clearly real, not noise; check the actual numbers before
  trusting the assertion; see `test/difficultyComparison.test.ts` (leader-trick-win-rate, isolating
  a specific leading-heuristic change) and `test/hardVsNormal.test.ts` (full-game cumulative score,
  isolating ISMCTS's overall strength) for two different metrics fit to two different kinds of
  change. ISMCTS-in-the-loop comparisons need their own PRNG for the search's internal randomness,
  entirely separate from the one driving deals — the search can consume a variable, large number of
  random draws per decision that has nothing to do with how many draws the comparison condition
  would have consumed at the same point; sharing one PRNG between them desyncs every deal after the
  first divergence and silently invalidates the "same seed -> same deals" premise the comparison
  depends on.
- ISMCTS-specific: test `determinizeHands` on its own (own hand preserved exactly, opponent hand
  sizes match `state.hands[opponent].length`, no card dealt twice or already-played, voids never
  violated) — hand-built `GameState` fixtures for this must keep the same 52-card accounting any
  real reachable state has (own hand + played cards + every opponent's remaining hand = 52), or
  determinization will correctly reject the fixture as unsatisfiable.
- Legality is the one property that must hold unconditionally, including at the edges: a
  property-based test (fast-check) across random game states *and* random search budgets down to
  zero is what actually exercises "the budget expired before any iteration completed" — a case
  regular example-based tests are easy to forget.
