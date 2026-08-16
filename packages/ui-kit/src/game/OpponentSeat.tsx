import { StyleSheet, Text, View } from "react-native";
import { colors, fonts, spacing } from "../theme";
import { Avatar } from "./Avatar";
import { CardBack, CardBackStyle } from "./CardBack";
import { TrickPile } from "./TrickPile";

export interface OpponentSeatProps {
  label: string;
  cardCount: number;
  isCurrentTurn: boolean;
  /** How many tricks this opponent has won so far this hand. */
  tricksWon: number;
  /** Whether this seat is dealing the current hand — always shown, independent of whose turn it is. */
  isDealer: boolean;
  /** Which face-down pattern to render for this opponent's hidden hand — the player's Settings
   * choice. Defaults to CardBack's own default ("lattice") when omitted. */
  cardBackStyle?: CardBackStyle;
}

/** An opponent's seat: identity (Avatar — name, turn-glow, dealer badge), remaining card count,
 * and their face-down pile of tricks won so far. Their card for the trick in progress shows in
 * the table's center pile instead (see Table), not pinned to their seat. */
export function OpponentSeat({ label, cardCount, isCurrentTurn, tricksWon, isDealer, cardBackStyle }: OpponentSeatProps) {
  return (
    <View style={styles.container}>
      <Avatar name={label} isActive={isCurrentTurn} isDealer={isDealer} size="sm" />
      <View style={styles.stack}>
        <CardBack variant={cardBackStyle} />
        <Text style={styles.count}>×{cardCount}</Text>
      </View>
      <TrickPile count={tricksWon} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    padding: spacing.sm,
  },
  stack: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  count: {
    color: colors.secondaryText,
    fontFamily: fonts.body,
    fontSize: 13,
  },
});
