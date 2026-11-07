---
name: king-ui-modernization
description: Use this skill when improving the visual polish of King's UI beyond functional correctness — table atmosphere, card rendering depth, player identity/avatars, iconography for the alt-rules/contract menu, and motion. Triggers on requests to make a screen "feel less flat," "look more modern," add player avatars, improve card art, or benchmark against reference apps (King HD, King Bobola).
---

# King UI modernization

Guidance for closing the visual gap between King's functional MVP screens and polished reference
apps in the same genre (King HD, King Bobola), without touching game logic. This skill is about
*feel*, not correctness — pair it with king-cross-platform-ui for anything that also changes
layout/behavior.

## Baseline audit (2026-08-16, our screenshots vs. King HD / King Bobola)

What's currently missing, in priority order:

1. **No player identity.** Opponents render as plain "Bot 1/2/3" text over a generic card-back
   rectangle. Both reference apps use illustrated avatar portraits + a name + a level/star badge,
   and highlight whoever's turn it is with a glow/border on their avatar, not just a generic
   highlight. This is the single biggest driver of "feels like a wireframe" — fix this first, it's
   also comparatively cheap (a fixed set of avatar images + a name).
2. **Flat cards, no depth.** Cards are solid rectangles with corner-only pip/suit — no shadow, no
   thickness, no overlap-with-shadow when stacked in a trick. Reference apps render every card with
   a soft drop shadow and slight offset/rotation when more than one is on the table.
3. **Flat table, no atmosphere.** Solid-fill green background, no texture/vignette. Reference apps
   use a textured felt or wood-panel background with a subtle vignette toward the edges.
4. **Alt-rules/contract selection is a plain list, not iconography.** King Bobola's "Choose
   Contract" screen is an icon-tile grid (a small illustrated glyph per hand type: crossed hearts
   for No Hearts, crossed queen for No Queens, a "2" with a slash for No Last Two, suit glyphs for
   trump selection) — recognizable at a glance, not read as text. Match this for the settings /
   alt-rules menu and the in-hand contract-choice moment.
5. **No score/contract progress visualization.** Reference apps show a running progress bar toward
   the match target (e.g. "23/5") next to the score, not just a bare number.
6. **No social affordances.** Chat/emoji reaction buttons in Bobola — lowest priority, only relevant
   once real multiplayer (not bots) is live.

## Principles

- **Assets, not re-architecture.** Almost everything above is solved with better assets (avatar
  art, card art, table texture) and a shadow/elevation layer already available in React Native
  (`elevation` on Android, `shadow*` props on iOS/web) — not a framework change. See the Tech Stack
  Decision doc: the current Expo/RN + react-native-web stack is fine for this; add
  `react-native-reanimated` for motion and `react-native-skia` only if a specific effect (gloss,
  particle, dynamic shadow) genuinely needs it.
- **Depth via shadow/offset, not skeuomorphism.** Lean toward the Bobola direction (flat-modern +
  shadow/depth + character illustration) over the King HD direction (heavy wood-panel
  skeuomorphism) — it ages better and is cheaper to keep visually consistent across Web/Android/iOS.
- **Card art and avatars live in `packages/ui-kit`**, shared across the modes that need them
  (Scorekeeper doesn't need avatars, but Solo-vs-AI and Local both do) — don't duplicate assets or
  rendering logic per screen, same rule as king-cross-platform-ui applies to components.
- **Generated art (Nano Banana) needs a spec, not just a prompt.** For any AI-generated asset
  (card backs, avatar portraits, table texture): fix the target resolution, aspect ratio, whether a
  transparent background is required, and file format *before* generating, and generate the full
  set in one style pass (same prompt scaffold, varied subject) rather than one-off prompts, so the
  set reads as one coherent deck/roster instead of mismatched styles.

## Before calling a modernization pass done

- [ ] Compared side-by-side against the current reference screenshots (or updated ones, if the
      references change) — not just "does it look nicer in isolation."
- [ ] New art assets are in `packages/ui-kit`/`apps/mobile/assets` at a resolution that stays sharp
      on the largest supported tablet/web viewport, not just phone-sized.
- [ ] Avatars/card art render correctly on Web, Android, and iOS (per king-cross-platform-ui).
- [ ] No game logic touched — this skill only changes what things look like, never what's legal or
      how scoring works.
