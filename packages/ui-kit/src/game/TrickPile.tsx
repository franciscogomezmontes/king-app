import { StyleSheet, Text, View } from "react-native";

export interface TrickPileProps {
  /** How many tricks this player has won so far this hand. */
  count: number;
}

/**
 * A small face-down pile of the tricks a player has won so far this hand — mirroring how tricks
 * get physically gathered face down in front of the winner at a real table, rather than only
 * showing a bare number.
 */
export function TrickPile({ count }: TrickPileProps) {
  if (count === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.stack}>
        <View style={[styles.miniCard, styles.miniCardBack]} />
        <View style={styles.miniCard} />
      </View>
      <Text style={styles.count}>{count}</Text>
    </View>
  );
}

const MINI_WIDTH = 20;
const MINI_HEIGHT = 28;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  stack: {
    width: MINI_WIDTH + 4,
    height: MINI_HEIGHT,
  },
  miniCard: {
    position: "absolute",
    left: 4,
    top: 0,
    width: MINI_WIDTH,
    height: MINI_HEIGHT,
    borderRadius: 3,
    backgroundColor: "#0f4d38",
    borderWidth: 1,
    borderColor: "#f5e6c8",
  },
  miniCardBack: {
    left: 0,
    top: 2,
  },
  count: {
    color: "#c9d8cf",
    fontSize: 12,
    fontWeight: "600",
  },
});
