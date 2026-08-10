# King (Rey)

Cross-platform (Web, Android, iOS) app for King: solo vs. computer, local pass-and-play,
in-person scorekeeping, and (later) online multiplayer, with a personalizable alternative-rules
menu.

Start with `CLAUDE.md` — it's the standing brief for working on this repo (with or without Claude
Code). Project plan and research live in the linked Notion workspace and the "King" Claude
Project.

## Layout

- `packages/rules-engine` — pure TS game logic: deck, deal, trick resolution, scoring, alternative
  rule toggles. Single source of truth, consumed by everything else.
- `packages/ai-opponent` — computer player logic, built on `rules-engine`.
- `packages/ui-kit` — shared card/table/score UI components (React Native + web).
- `apps/mobile` — the Expo app: Web, Android, and iOS from one codebase.
- `apps/server` — real-time multiplayer server (Node + Colyseus), added in the Online Multiplayer
  phase — currently a placeholder.

## Getting started

```bash
pnpm install
pnpm --filter rules-engine test   # verify the engine's zero-sum tests pass
pnpm mobile                        # starts Expo — press w for web, a for Android, i for iOS
```
