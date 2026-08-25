/**
 * Club Rey visual tokens — forest-and-gold Bogotá salon / club table.
 * Screens and components should import from here instead of copying hex values.
 */

export const colors = {
  felt: "#0b3d2e",
  surface: "#0f4d38",
  accent: "#1c7a53",
  cream: "#f5e6c8",
  muted: "#8fae9c",
  secondaryText: "#c9d8cf",
  gold: "#f2c14e",
  heart: "#a8322d",
  ink: "#1a1a1a",
  overlay: "rgba(11, 30, 23, 0.42)",
  goldMuted: "rgba(242, 193, 78, 0.28)",
  feltWell: "rgba(0, 0, 0, 0.2)",
  validationOk: "#4caf50",
  validationWarn: "#e0a53a",
} as const;

/** Loaded in apps/mobile/App.tsx via expo-font + @expo-google-fonts. */
export const fonts = {
  display: "CormorantGaramond_700Bold",
  displaySemi: "CormorantGaramond_600SemiBold",
  body: "SourceSans3_400Regular",
  bodySemi: "SourceSans3_600SemiBold",
  bodyBold: "SourceSans3_700Bold",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 4,
  md: 8,
  lg: 12,
  card: 6,
  pill: 999,
} as const;

export const typography = {
  displayLg: {
    fontFamily: fonts.display,
    fontSize: 48,
    lineHeight: 52,
    color: colors.cream,
  },
  displayMd: {
    fontFamily: fonts.display,
    fontSize: 28,
    lineHeight: 32,
    color: colors.cream,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 24,
    lineHeight: 28,
    color: colors.cream,
  },
  // Bumped a size step (per Francisco's "el tamaño de la letra está muy pequeño" feedback) now
  // that hiding the score-summary bars by default and tightening the table layout (see Table.tsx/
  // OpponentSeat.tsx) freed real vertical room to spend on it — verified this doesn't reintroduce
  // the scroll that tightening pass just fixed (see the Playwright checks run alongside it).
  body: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 21,
    color: colors.secondaryText,
  },
  label: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    lineHeight: 19,
    color: colors.cream,
  },
  caption: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 19,
    color: colors.muted,
  },
} as const;

export const layout = {
  // A phone is essentially never wider than this, so raising it only changes anything on a wide
  // Web viewport — where the board otherwise sat in an unnecessarily narrow, phone-width column
  // with empty space on both sides.
  maxContentWidth: 640,
} as const;

export const theme = {
  colors,
  fonts,
  spacing,
  radii,
  typography,
  layout,
} as const;

export type Theme = typeof theme;
