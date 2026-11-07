import { Pressable, StyleSheet, View } from "react-native";
import { colors } from "../theme";

export interface BackButtonProps {
  onPress: () => void;
  /** Accessible label — every screen's own translated "back to menu"/"leave room" copy, since
   * `onPress` isn't always plain navigation (e.g. Online's leave-room sites tear the room down
   * first). Not rendered as visible text — the glyph alone is the standardized visual. */
  label: string;
}

/**
 * The single "go back" affordance every screen should use, always the same circular "<" chevron in
 * the same top-left position. Replaces the ad-hoc `Button variant="ghost"` (or, in a couple of
 * places, the plain unstyled default) each screen previously rolled on its own, scattered between
 * the top of a header row and the bottom of a scroll column — see the standardization pass this
 * component landed with. Styled to match Home's own top-right gear-icon button (`App.tsx`) so the
 * two corner affordances read as one consistent pattern.
 *
 * The chevron itself is drawn as a rotated square corner (two borders, no text glyph) rather than
 * a "<" character — a real font glyph's ink is essentially never centered within its own advance
 * width/line-height box (confirmed: even with `textAlign`/`includeFontPadding` tuned, "<" still
 * read off-center per Francisco's feedback), so hand-tuning a per-platform pixel offset would be
 * fighting font metrics instead of just sidestepping them. A geometric shape has no such metrics —
 * centering it in the circle is a plain flexbox center, exact on every platform.
 */
export function BackButton({ onPress, label }: BackButtonProps) {
  return (
    <Pressable onPress={onPress} accessibilityLabel={label} style={styles.button}>
      <View style={styles.chevron} />
    </Pressable>
  );
}

const CHEVRON_SIZE = 14;
const CHEVRON_THICKNESS = 3.5;

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.goldMuted,
  },
  chevron: {
    width: CHEVRON_SIZE,
    height: CHEVRON_SIZE,
    borderColor: colors.gold,
    borderTopWidth: CHEVRON_THICKNESS,
    borderLeftWidth: CHEVRON_THICKNESS,
    // A square's own top-left corner, rotated 45°, reads as a left-pointing "<" chevron — the
    // standard CSS border-corner arrow trick. Nudged 1px right of dead-center: a rotated square's
    // *visual* center (the midpoint of its now-diagonal corner point) sits very slightly left of
    // its own bounding box's geometric center, an artifact of the rotation itself, not a font
    // metric — same class of fix as PlayingCard's own pip/corner-index centering work.
    transform: [{ rotate: "-45deg" }, { translateX: 1 }],
  },
});
