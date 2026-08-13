import { StyleSheet, Text, View } from "react-native";
import { colors, fonts, radii, spacing } from "../theme";
import { CardBack } from "./CardBack";
import { DealerBadge } from "./DealerBadge";
import { TrickPile } from "./TrickPile";

export interface OpponentSeatProps {
  label: string;
  cardCount: number;
  isCurrentTurn: boolean;
  /** How many tricks this opponent has won so far this hand. */
  tricksWon: number;
  /** Whether this seat is dealing the current hand — always shown, independent of whose turn it is. */
  isDealer: boolean;
}

/** An opponent's seat: name/position, remaining card count, and their face-down pile of tricks
 * won so far — highlighted on their turn, badged when they're the dealer. Their card for the
 * trick in progress shows in the table's center pile instead (see Table), not pinned to their seat. */
export function OpponentSeat({ label, cardCount, isCurrentTurn, tricksWon, isDealer }: OpponentSeatProps) {
  return (
    <View style={[styles.container, isCurrentTurn && styles.active]}>
      <Text style={[styles.label, isCurrentTurn && styles.labelActive]}>{label}</Text>
      <View style={styles.stack}>
        <CardBack />
        <Text style={styles.count}>×{cardCount}</Text>
      </View>
      {isDealer && <DealerBadge />}
      <TrickPile count={tricksWon} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    padding: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: "transparent",
  },
  active: {
    backgroundColor: colors.accent,
    borderColor: colors.gold,
  },
  label: {
    color: colors.cream,
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
  },
  labelActive: {
    color: colors.gold,
  },
  stack: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  count: {
    color: colors.secondaryText,
    fontFamily: fonts.body,
    fontSize: 13,
  },
});
