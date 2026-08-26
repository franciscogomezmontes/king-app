import { useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
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

const PANEL_WIDTH = 240;
const SCREEN_MARGIN = 12;

interface Anchor {
  /** Hang the panel off the badge's left edge (extending further left) instead of its right. */
  leftward: boolean;
  /** Never wider than `PANEL_WIDTH`, but shrunk to whatever room actually exists on the chosen
   * side — picking a side alone isn't enough on a narrow phone: a badge sitting anywhere past
   * roughly the screen's own midpoint doesn't have `PANEL_WIDTH` of clearance on *either* side, so
   * the panel needs to size itself down to fit, not just relocate to a side that still overflows a
   * little less. */
  width: number;
}

const DEFAULT_ANCHOR: Anchor = { leftward: false, width: PANEL_WIDTH };

/**
 * A small "(i)" badge that reveals a short explanation on tap, dismissed by tapping it again.
 * Reserves screen space for the explanation only when it's actually open — the alternative to
 * always-visible inline description text this app used to show under every hand title and
 * alt-rule toggle, per Francisco's request to shrink those and afford bigger text elsewhere. Uses
 * plain `position: "absolute"` (not React Native's `Modal`), consistent with how the rest of this
 * app avoids `Modal` — see `king-cross-platform-ui`: it behaves inconsistently across Web/Android/
 * iOS, whereas absolute positioning within a parent View is standard RN layout, not a special
 * platform-bridged component.
 *
 * Before opening, measures the badge's real on-screen position via `measureInWindow` (its position
 * *within a parent View* isn't enough — what actually clips the panel is the device viewport) and
 * picks whichever side of the badge has more room, capping the panel's own width to whatever
 * that side actually has rather than assuming the full `PANEL_WIDTH` always fits somewhere. A
 * badge sitting well past the screen's own midpoint (e.g. one following a long hand name like "No
 * K de Corazones (Rey de Corazones)") doesn't have `PANEL_WIDTH` of clearance on *either* side —
 * confirmed from a real device screenshot, not just a theoretical case — so "flip to whichever
 * side isn't clipped" alone isn't sufficient; the width has to adapt too.
 */
export function InfoTooltip({ content, label, open, onToggle }: InfoTooltipProps) {
  const badgeRef = useRef<View>(null);
  const [anchor, setAnchor] = useState<Anchor>(DEFAULT_ANCHOR);
  const { width: windowWidth } = useWindowDimensions();

  function handlePress() {
    if (!open) {
      badgeRef.current?.measureInWindow((x, _y, badgeWidth) => {
        const spaceRight = windowWidth - (x + badgeWidth) - SCREEN_MARGIN;
        const spaceLeft = x - SCREEN_MARGIN;
        setAnchor({
          leftward: spaceLeft > spaceRight,
          width: Math.min(PANEL_WIDTH, Math.max(spaceRight, spaceLeft)),
        });
      });
    }
    onToggle();
  }

  return (
    <View style={styles.wrap}>
      <Pressable ref={badgeRef} onPress={handlePress} accessibilityLabel={label} style={styles.badge}>
        <Text style={styles.glyph}>i</Text>
      </Pressable>
      {open && (
        <Panel style={[styles.panel, { width: anchor.width }, anchor.leftward ? styles.panelLeftward : styles.panelRightward]}>
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
  panelRightward: {
    left: 0,
  },
  panelLeftward: {
    right: 0,
  },
  text: {
    color: colors.cream,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "left",
  },
});
