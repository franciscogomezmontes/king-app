# King — Card Game App

Cross-platform (Web, Android, iOS) implementation of King (a.k.a. Rey), the ten-hand trick-taking
card game. Modes: physical-game **Scorekeeper**, **Solo vs. 3 AI opponents**, **Local pass-and-play**
(4 humans, 1 device), and (later) **Online multiplayer**. Every player can personalize the game
through a menu of optional alternative rules.

This file is the standing brief for any Claude Code session in this repo. Read it before making
changes. Keep it current — when a decision here changes, update this file in the same session.

## Where the rest of the plan lives

- **Notion — "King App — Project Plan"**: phase-by-phase build plan and status tracking. Check
  this first for what's next and to log progress.
- **Notion — "King — Card Game App" hub**: also has "Game Research & Rule Comparisons",
  "Tech Stack & Architecture", and "Rules Reference (Digitized)" pages with full detail behind the
  summaries below.
- **Claude Project "King"**: `King Rules.docx` (source of truth for rules) and planning docs.
- **`Rules/King Rules.docx`** and **`King Scorekeeper.xlsx`** in this repo (or the user's `King`
  folder) — the family's existing pen-and-paper-replacement spreadsheet. Its scoring values and
  per-hand validation pattern are the ground truth to match.

## Core principles (do not violate these)

1. **The rules engine is the single source of truth.** `packages/rules-engine` owns all game logic
   — dealing, legality, trick resolution, scoring. UI code and the multiplayer server *consume* it;
   they never reimplement or duplicate scoring math.
2. **Zero-sum is sacred.** After all 10 hands, all four players' scores must sum to exactly 0
   (default: negative hands sum to −1,300, positive hands sum to +1,300). Any change touching
   scoring must come with a test proving the invariant still holds — including for every enabled
   combination of alternative rules, not just the defaults.
3. **Alternative rules are configuration, not forks.** Never branch the codebase per ruleset or
   hardcode "if Colombia then...". Two typed config objects, at two different scopes:
   `RuleSet` (`packages/rules-engine/src/types.ts`) is *per-computation* — "what's in effect for
   this specific `legalPlays`/`resolveTrick`/`scorePositiveHand`/`resolveAuction` call" — and is
   unaware of game setup. `GameRules` (`packages/rules-engine/src/game/state.ts`) is the *per-game
   setup menu* a player configures once: `mandatoryKilling`, `auctionMustSell` are fixed toggles;
   `playingDownEnabled`, `backwardsEnabled` instead *gate* a live per-hand choice (CLAUDE.md's own
   "dealer chooses direction" / "for that hand" wording means these are picked fresh by whoever
   names trump each positive hand, not fixed once — the toggle only controls whether that choice
   is offered at all). The game-state layer composes the per-hand effective `RuleSet` from
   `GameRules` + that hand's live choice before calling into the engine — see `currentRuleSet()`
   in `game/actions.ts`.
4. **Cross-platform from day one.** Built in Expo (React Native + react-native-web). Avoid
   platform-only APIs without an abstraction. Sanity-check Web, Android, and iOS rendering for any
   non-trivial UI change — don't assume RN components look right on web or vice versa.
5. **Offline-first where it matters.** Scorekeeper, Solo-vs-AI, and Local pass-and-play must work
   with zero backend dependency. Only Online Multiplayer needs the server.
6. **Small, reviewable changes.** One phase or feature per branch/session (see the Notion plan's
   phase breakdown). Don't mix rules-engine changes with unrelated UI work in the same change.
7. **English and Spanish from the start.** Every player-facing string ships in both locales in the
   same change that introduces it — see "Localization (i18n)" below. Don't land English-only UI
   copy intending to translate it later.

## Repo layout

```
king-app/
  packages/
    rules-engine/   # pure TS: deck, deal, trick resolution, scoring, RuleSet/alt-rule toggles;
                    # src/game/ composes all of it into a GameState state machine (deal -> trump/
                    # auction setup -> trick-by-trick play -> scoring -> next hand -> game-complete)
    ai-opponent/     # bot logic built on top of rules-engine (heuristic -> ISMCTS)
    ui-kit/           # shared card/table/score components (RN + web); also owns i18n setup
  apps/
    mobile/           # Expo app: Web, Android, iOS from one codebase; owns its own UI copy (en/es)
    server/           # Node.js + Colyseus real-time server (Online Multiplayer phase only)
  CLAUDE.md
  .claude/skills/
```

## Stack quick reference

TypeScript everywhere. Expo + react-native-web for the client. Zustand for UI state (engine owns
game state). i18next + react-i18next for localization (English + Spanish). Vitest for tests.
Colyseus on Node for the future multiplayer server. EAS Build for store binaries. GitHub Actions CI
runs rules-engine tests + lint on every PR before anything else. Full rationale: Notion
"Tech Stack & Architecture".

## Localization (i18n)

English and Spanish are both first-class from Phase 0 — not a later retrofit.

- **Library:** i18next + react-i18next, with `expo-localization` for device-locale detection.
- **`packages/ui-kit/src/i18n`** owns the i18n *infrastructure* (`createI18n()`, `Locale`/
  `SUPPORTED_LOCALES`, `resolveSupportedLocale()`) plus a `"rules"` namespace of hand-type and
  alt-rule-toggle labels typed directly against rules-engine's `NegativeHandType`/`RuleSet` (via
  `Record<NegativeHandType, ...>` etc.) — adding a hand type or toggle without translating it for
  both locales is a compile error, not a silent gap.
- **Each app owns its own screen-copy namespace** (e.g. `apps/mobile/src/i18n/resources.ts`'s
  `"app"` namespace) and merges it into `createI18n()` alongside ui-kit's `"rules"` namespace.
  Add new UI strings in English and Spanish together, in the same file.
- Locale is detected from the device and can be overridden at runtime (`apps/mobile` shows a
  manual EN/ES switcher) — never assume the device locale is the only way a player picks a
  language.
- The Spanish negative-hand names in `rulesResources.ts` are the family's own terms from
  `King Scorekeeper.xlsx`: No Bazas, No Corazones, No J's ni K's (Jotas y Reyes), No Q's (Damas),
  No K de Corazones (Rey de Corazones), No 2 últimas.
- Known follow-up: `rulesResources.ts`'s `RuleToggleKey`/settings-menu labels are still keyed off
  `RuleSet`, but the real settings-menu type is now `GameRules` (see principle 3) — `RuleSet` has
  no `playingDownEnabled`/`backwardsEnabled` fields to label. Nothing renders that menu yet, so
  this hasn't broken anything, but re-key it off `GameRules` when the real settings screen is
  built (Phase 3+) rather than carrying the mismatch forward.

## Game rules quick reference

4 players, 52-card deck, 13 cards each, aces high, no trumps in negative hands.

**Six negative hands** (in order): No Tricks (−20/trick) · No Hearts (−20/heart) · No Gentlemen,
i.e. K/J (−30/card) · No Lady, i.e. Q (−50/card) · No King of Hearts (−160) · No Last Two Tricks
(−90 each). Hearts may only be led in the Hearts/K♥ hands if that's all a player has left. Total
across all players: exactly −1,300.

**Four positive hands**: dealer names trump, declares no-trump, or auctions the right to the other
three players. Default scoring: +25/trick captured. Total across all players: exactly +1,300.

**Alternative rules (toggleable, positive hands only)**:
- *Mandatory Killing* — must beat the highest card of the led suit if able; else must trump if
  able; free play only if void in both.
- *Auction Must Sell* — dealer is forced to accept the winning auction bid.
- *Playing Up / Playing Down* — a per-game toggle (`GameRules.playingDownEnabled`) gates whether
  the dealer may ever choose "down" for a hand; when gated on, they choose fresh each positive
  hand. Up = +25/trick. Down = start at 325, −75/trick captured (can go negative on 5+ tricks).
- *Backwards* — a per-game toggle (`GameRules.backwardsEnabled`) gates whether whoever names trump
  may reverse rank (2 high → Ace low) for that hand; when gated on, it's chosen fresh each
  positive hand, independent of the trump/no-trump choice.

Candidate additional rules (not yet decided — see Notion "Game Research & Rule Comparisons"
before implementing any of these): Salade/"Todos" combined negative round, shoot-the-moon-style
reversal, misdeal/redeal conditions, doubling/redoubling, mandatory minimum bid, kitty-card trump
hint, target-score match play, short "quick game" mode, partnership scoring overlay.

**Not confirmed by the digitized rules doc** (defaulted to the standard convention for this game
family, kept as swappable call-time parameters in `game/dealer.ts` rather than baked into control
flow — see `DealerRotation`/`FirstLeaderRule`): the dealer rotates one seat left every one of the
10 hands; the seat left of the dealer leads each hand's first trick. Worth a quick sanity check
against `King Rules.docx` when convenient.

## Testing expectations

- `packages/rules-engine` and `packages/ai-opponent`: Vitest, including property-based tests that
  assert the zero-sum invariant for every `RuleSet` combination touched by a change.
- New alt-rule toggle → new combination tests, not just a single "toggle on" happy path.
- UI changes: check Web, Android, and iOS layout before calling a change done.
- New player-facing string → both locales present, or the translation-completeness tests in
  `packages/ui-kit/test/i18n.test.ts` (and TypeScript, for the `"rules"` namespace) should fail.

## Workflow notes for Claude Code sessions here

- Rules/scoring changes and multiplayer sync changes are exactly the kind of work worth pausing to
  plan before writing code — a subtle bug here is expensive to find later.
- Point yourself at the Notion project plan phase you're working on at the start of a session.
- Independent, well-specified slices (e.g. "AI heuristic for the No Lady hand" while UI work
  happens elsewhere) are good candidates for a parallel subagent/worktree session.
