import { StyleSheet, View } from "react-native";
import { KingMark } from "../primitives/KingMark";
import { colors, radii } from "../theme";
import { CARD_HEIGHT, CARD_WIDTH } from "./PlayingCard";

export type CardBackStyle = "lattice" | "rings" | "frame";

/** In display order for a settings picker. */
export const CARD_BACK_STYLES: CardBackStyle[] = ["lattice", "rings", "frame"];

// Tuned to fill the card back's inner well right up to its edges — recompute these if
// CARD_WIDTH/CARD_HEIGHT (PlayingCard.tsx) change again, or the lattice stops short and leaves a
// bare gap at the bottom/right instead of covering the whole card.
const LATTICE_COLS = 5;
const LATTICE_ROWS = 8;
const CELL = 11;

export interface CardBackProps {
  variant?: CardBackStyle;
}

/** A face-down card — opponents' hidden hands. Three selectable patterns (Views/borders only, no
 * image assets — consistent with the rest of the deck), always topped with the K♥ mark so every
 * variant still reads as "this game's deck" at a glance. */
export function CardBack({ variant = "lattice" }: CardBackProps) {
  return (
    <View style={styles.card}>
      <View style={styles.inner}>
        {variant === "lattice" && <LatticePattern />}
        {variant === "rings" && <RingsPattern />}
        {variant === "frame" && <FramePattern />}
        <View style={styles.mark}>
          <KingMark size="sm" />
        </View>
      </View>
    </View>
  );
}

function LatticePattern() {
  return (
    <View style={styles.lattice} pointerEvents="none">
      {Array.from({ length: LATTICE_ROWS }, (_, row) =>
        Array.from({ length: LATTICE_COLS }, (_, col) => (
          <View
            key={`${row}-${col}`}
            style={[
              styles.diamond,
              {
                left: 4 + col * CELL,
                top: 5 + row * CELL,
              },
            ]}
          />
        )),
      )}
    </View>
  );
}

function RingsPattern() {
  return (
    <View style={styles.ringCenter} pointerEvents="none">
      <View style={[styles.ring, { width: 58, height: 58, borderRadius: 29 }]} />
      <View style={[styles.ring, styles.ringAbsolute, { width: 42, height: 42, borderRadius: 21 }]} />
      <View style={[styles.ring, styles.ringAbsolute, { width: 24, height: 24, borderRadius: 12 }]} />
    </View>
  );
}

function FramePattern() {
  return (
    <View style={styles.frameOuter} pointerEvents="none">
      <View style={styles.frameInner} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.gold,
    padding: 3,
  },
  inner: {
    flex: 1,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: colors.goldMuted,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  mark: {
    backgroundColor: colors.felt,
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: colors.goldMuted,
  },
  // lattice
  lattice: {
    ...StyleSheet.absoluteFillObject,
  },
  diamond: {
    position: "absolute",
    width: 7,
    height: 7,
    borderWidth: 1,
    borderColor: colors.goldMuted,
    transform: [{ rotate: "45deg" }],
  },
  // rings
  ringCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    borderWidth: 1.5,
    borderColor: colors.goldMuted,
  },
  ringAbsolute: {
    position: "absolute",
  },
  // frame
  frameOuter: {
    position: "absolute",
    top: 6,
    left: 6,
    right: 6,
    bottom: 6,
    borderWidth: 1.5,
    borderColor: colors.goldMuted,
    borderRadius: 6,
  },
  frameInner: {
    position: "absolute",
    top: 6,
    left: 6,
    right: 6,
    bottom: 6,
    borderWidth: 1,
    borderColor: colors.goldMuted,
    borderRadius: 4,
  },
});
