import { StyleSheet, Text, View } from "react-native";
import { CardBack } from "./CardBack";
import { TrickPile } from "./TrickPile";

export interface OpponentSeatProps {
  label: string;
  cardCount: number;
  isCurrentTurn: boolean;
  /** How many tricks this opponent has won so far this hand. */
  tricksWon: number;
}

/** An opponent's seat: name/position, remaining card count, and their face-down pile of tricks
 * won so far — highlighted on their turn. Their card for the trick in progress shows in the
 * table's center pile instead (see Table), not pinned to their seat. */
export function OpponentSeat({ label, cardCount, isCurrentTurn, tricksWon }: OpponentSeatProps) {
  return (
    <View style={[styles.container, isCurrentTurn && styles.active]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.stack}>
        <CardBack />
        <Text style={styles.count}>×{cardCount}</Text>
      </View>
      <TrickPile count={tricksWon} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    padding: 8,
    borderRadius: 10,
  },
  active: {
    backgroundColor: "#1c7a53",
  },
  label: {
    color: "#f5e6c8",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
  },
  stack: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  count: {
    color: "#c9d8cf",
    fontSize: 13,
  },
});
