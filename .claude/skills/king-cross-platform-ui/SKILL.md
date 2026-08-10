---
name: king-cross-platform-ui
description: Use this skill when building or modifying UI for the King app in apps/mobile or packages/ui-kit — card/hand/table rendering, score displays, the alternative-rules settings menu, or any screen that must render correctly on Web, Android, and iOS from one Expo/React Native codebase. Triggers on requests involving card game UI, table layout, hand fan-out, trick animation, score board, or cross-platform layout bugs.
---

# King cross-platform UI

Guidance for building UI once in Expo (React Native + react-native-web) that actually looks right
on Web, Android, and iOS — not just "runs without crashing" on all three.

## Non-negotiables

- Every non-trivial screen or component change gets checked on **Web, Android, and iOS**
  (simulators/emulators or `expo start --web`) before it's considered done. RN layout primitives
  (Flexbox defaults, shadow/elevation, safe-area insets, text line-height) diverge across these
  targets more often than expected.
- Shared components live in `packages/ui-kit`; app-specific screens live in `apps/mobile`. If a
  component is reused across Scorekeeper, Solo-vs-AI, and Local modes (card, hand, score row,
  rule-toggle switch), it belongs in `ui-kit`, not duplicated per screen.
- Touch targets sized for the smallest supported phone screen first, then scaled up for
  tablet/web — this is a card game with 13-card hands that must stay tappable on a phone.

## Modes this UI serves (design for reuse, not one-off screens)

1. **Scorekeeper** — no cards rendered at all, just structured number entry per hand per player
   plus running totals. Mirror the validation pattern from the family's existing spreadsheet: each
   hand row should visibly confirm it sums to that hand's fixed total, and the game should show a
   final zero-sum check. This is the fastest mode to ship and the most number-input-heavy — prioritize
   fast, error-resistant entry (steppers/large tap targets) over visual flourish.
2. **Solo vs. AI / Local pass-and-play** — full table view: 13-card hand fan for the active player,
   opponents shown as card backs/counts, current trick in the center, running score accessible
   without leaving the table. Local pass-and-play reuses this screen with a hide-hand-between-turns
   step added.
3. **Settings / alternative rules menu** — a straightforward toggle list (Mandatory Killing,
   Auction Must Sell, Playing Up/Down, Backwards, plus whatever's been accepted from the research
   candidates) with a short inline description per toggle, not just a bare label — most players
   won't remember what "Auction Must Sell" means from the name alone.

## Practical cross-platform gotchas to check for

- `Modal` and platform-specific presentation styles can behave very differently on web vs. native
  (full-screen takeover on web being the most common surprise) — verify explicitly rather than
  assuming parity.
- Card fan/overlap layouts using absolute positioning need separate verification at phone width vs.
  wider web viewports — don't let the hand overflow or overlap unreadably on either extreme.
- Haptic feedback (`expo-haptics`) is native-only — gate it or provide a no-op/visual equivalent on
  web rather than letting it silently no-op in a way that changes felt responsiveness.
- Prefer platform-agnostic gesture handling (press/tap) for card selection over drag-and-drop
  unless drag is validated to work acceptably on all three targets.

## Before calling a UI change done

- [ ] Verified on Web, Android, and iOS (or documented why one wasn't available in this session).
- [ ] Shared logic/markup extracted to `ui-kit` if used by more than one mode.
- [ ] Works at a small phone screen width without horizontal scrolling or clipped controls.
- [ ] No game-state or scoring logic embedded in the component — it reads from and dispatches to
      `rules-engine`/store only.
