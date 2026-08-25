import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts, radii, spacing } from "../theme";
import { Panel } from "./Surface";

export interface InfoTooltipProps {
  /** The explanation shown when the badge is tapped. */
  content: string;
  /** Accessible label for the trigger badge itself (e.g. "About this hand"). */
  label: string;
  /** Whether the explanation is currently shown. Controlled by the caller (not local state) so
   * the caller can also raise its own container's `zIndex`/`elevation` while open — an absolutely
   * positioned child only wins the stacking order against a *later sibling of its own direct
   * parent*; it can't out-rank a great-uncle element (e.g. the next row in a list, or the table
   * felt below this panel) without that ancestor also being elevated. See `ScorePanel.tsx`'s and
   * `SettingsScreen.tsx`'s own callers for the pattern. */
  open: boolean;
  onToggle: () => void;
}

// Serif, for a deliberately different (more "reference note") look than the app's own display/
// body fonts — Times New Roman isn't bundled (unlike CormorantGaramond/SourceSans3), so it's only
// literally available on web and iOS (both ship it as a real system font); Android has no Times
// New Roman at all, so it falls back to RN's generic "serif" alias (Noto/Droid Serif) — still a
// serif face, just not byte-identical to Times.
const INFO_GLYPH_FONT = Platform.select({ web: "Times New Roman", ios: "Times New Roman", default: "serif" });

/**
 * A small "(i)" badge that reveals a short explanation on tap, dismissed by tapping it again.
 * Reserves screen space for the explanation only when it's actually open — the alternative to
 * always-visible inline description text this app used to show under every hand title and
 * alt-rule toggle, per Francisco's request to shrink those and afford bigger text elsewhere. Uses
 * plain `position: "absolute"` (not React Native's `Modal`), consistent with how the rest of this
 * app avoids `Modal` — see `king-cross-platform-ui`: it behaves inconsistently across Web/Android/
 * iOS, whereas absolute positioning within a parent View is standard RN layout, not a special
 * platform-bridged component.
 */
export function InfoTooltip({ content, label, open, onToggle }: InfoTooltipProps) {
  return (
    <View style={styles.wrap}>
      <Pressable onPress={onToggle} accessibilityLabel={label} style={styles.badge}>
        <Text style={styles.glyph}>i</Text>
      </Pressable>
      {open && (
        <Panel style={styles.panel}>
          <Text style={styles.text}>{content}</Text>
        </Panel>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    zIndex: 10,
  },
  badge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.goldMuted,
  },
  glyph: {
    width: "100%",
    fontSize: 15,
    lineHeight: 15,
    fontFamily: INFO_GLYPH_FONT,
    fontWeight: "700",
    color: colors.gold,
    textAlign: "center",
    textAlignVertical: "center",
    // Android inflates a Text's box with extra vertical padding baked into most fonts' own
    // metrics unless this is turned off — the same fix already used for every rank/suit glyph on
    // the cards themselves (see PlayingCard.tsx), needed again here for the same reason: a
    // one-line-height glyph badge like this has nowhere to hide that padding, so it reads as
    // "not actually centered" even though layout-wise it is.
    includeFontPadding: false,
  },
  panel: {
    position: "absolute",
    top: 28,
    left: 0,
    width: 240,
    borderWidth: 1,
    borderColor: colors.goldMuted,
    borderRadius: radii.md,
    padding: spacing.sm,
    // Belt-and-suspenders alongside the caller's own container elevation (see this component's
    // own `open` doc comment) — doesn't fix the cross-ancestor stacking issue by itself, but keeps
    // this panel above its own immediate siblings (e.g. the badge itself, sibling text) too.
    zIndex: 1000,
    elevation: 12,
  },
  text: {
    color: colors.cream,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "left",
  },
});
