import { StyleSheet, View } from "react-native";
import { KingMark } from "../primitives/KingMark";
import { colors, radii } from "../theme";
import { CARD_HEIGHT, CARD_WIDTH } from "./PlayingCard";

const LATTICE_COLS = 4;
const LATTICE_ROWS = 6;
const CELL = 11;

/** A face-down card — opponents' hidden hands. Patterned lattice + the K♥ mark, Views only. */
export function CardBack() {
  return (
    <View style={styles.card}>
      <View style={styles.inner}>
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
        <View style={styles.mark}>
          <KingMark size="sm" />
        </View>
      </View>
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
  mark: {
    backgroundColor: colors.felt,
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: colors.goldMuted,
  },
});
