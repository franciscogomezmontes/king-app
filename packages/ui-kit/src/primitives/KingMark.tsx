import { StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "../theme";

export type KingMarkSize = "sm" | "md" | "lg";

const SIZE: Record<KingMarkSize, { k: number; heart: number; gap: number }> = {
  sm: { k: 13, heart: 11, gap: 1 },
  md: { k: 22, heart: 18, gap: 2 },
  lg: { k: 40, heart: 32, gap: 4 },
};

/**
 * The Club Rey signature — K♥ — used as a mark on home and as the card-back motif.
 * Not a repeating wallpaper; one mark, on purpose.
 */
export function KingMark({ size = "md" }: { size?: KingMarkSize }) {
  const s = SIZE[size];
  return (
    <View style={styles.row} accessibilityRole="image" accessibilityLabel="King of hearts">
      <Text style={[styles.k, { fontSize: s.k, lineHeight: s.k + 4 }]}>K</Text>
      <Text style={[styles.heart, { fontSize: s.heart, lineHeight: s.heart + 4, marginLeft: s.gap }]}>♥</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  k: {
    fontFamily: fonts.display,
    color: colors.gold,
  },
  heart: {
    color: colors.heart,
  },
});
