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
3. **Alternative rules are configuration, not forks.** Model them as a typed `RuleSet` object the
   engine consumes (e.g. `{ mandatoryKilling, auctionMustSell, playingDirection, backwards, ... }`).
   Never branch the codebase per ruleset or hardcode "if Colombia then...".
4. **Cross-platform from day one.** Built in Expo (React Native + react-native-web). Avoid
   platform-only APIs without an abstraction. Sanity-check Web, Android, and iOS rendering for any
   non-trivial UI change — don't assume RN components look right on web or vice versa.
5. **Offline-first where it matters.** Scorekeeper, Solo-vs-AI, and Local pass-and-play must work
   with zero backend dependency. Only Online Multiplayer needs the server.
6. **Small, reviewable changes.** One phase or feature per branch/session (see the Notion plan's
   phase breakdown). Don't mix rules-engine changes with unrelated UI work in the same change.

## Repo layout

```
king-app/
  packages/
    rules-engine/   # pure TS: deck, deal, trick resolution, scoring, RuleSet/alt-rule toggles
    ai-opponent/     # bot logic built on top of rules-engine (heuristic -> ISMCTS)
    ui-kit/           # shared card/table/score components (RN + web)
  apps/
    mobile/           # Expo app: Web, Android, iOS from one codebase
    server/           # Node.js + Colyseus real-time server (Online Multiplayer phase only)
  CLAUDE.md
  .claude/skills/
```

## Stack quick reference

TypeScript everywhere. Expo + react-native-web for the client. Zustand for UI state (engine owns
game state). Vitest for tests. Colyseus on Node for the future multiplayer server. EAS Build for
store binaries. GitHub Actions CI runs rules-engine tests + lint on every PR before anything else.
Full rationale: Notion "Tech Stack & Architecture".

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
- *Playing Up / Playing Down* — dealer chooses direction. Up = +25/trick. Down = start at 325,
  −75/trick captured (can go negative on 5+ tricks).
- *Backwards* — whoever names trump can also reverse rank (2 high → Ace low) for that hand.

Candidate additional rules (not yet decided — see Notion "Game Research & Rule Comparisons"
before implementing any of these): Salade/"Todos" combined negative round, shoot-the-moon-style
reversal, misdeal/redeal conditions, doubling/redoubling, mandatory minimum bid, kitty-card trump
hint, target-score match play, short "quick game" mode, partnership scoring overlay.

## Testing expectations

- `packages/rules-engine` and `packages/ai-opponent`: Vitest, including property-based tests that
  assert the zero-sum invariant for every `RuleSet` combination touched by a change.
- New alt-rule toggle → new combination tests, not just a single "toggle on" happy path.
- UI changes: check Web, Android, and iOS layout before calling a change done.

## Workflow notes for Claude Code sessions here

- Rules/scoring changes and multiplayer sync changes are exactly the kind of work worth pausing to
  plan before writing code — a subtle bug here is expensive to find later.
- Point yourself at the Notion project plan phase you're working on at the start of a session.
- Independent, well-specified slices (e.g. "AI heuristic for the No Lady hand" while UI work
  happens elsewhere) are good candidates for a parallel subagent/worktree session.
