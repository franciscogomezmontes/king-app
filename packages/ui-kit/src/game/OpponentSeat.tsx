import { StyleSheet, Text, View } from "react-native";
import type { Card } from "rules-engine";
import { CardBack } from "./CardBack";
import { CARD_HEIGHT, PlayingCard } from "./PlayingCard";
import { TrickPile } from "./TrickPile";

export interface OpponentSeatProps {
  label: string;
  cardCount: number;
  isCurrentTurn: boolean;
  /** The card this opponent has played in the current trick, if any — shown face up beneath their seat. */
  playedCard?: Card | null;
  /** How many tricks this opponent has won so far this hand. */
  tricksWon: number;
}

/** An opponent's seat: name/position, remaining card count, their card for the trick in progress
 * (if played), and their face-down pile of tricks won so far — highlighted on their turn. */
export function OpponentSeat({ label, cardCount, isCurrentTurn, playedCard = null, tricksWon }: OpponentSeatProps) {
  return (
    <View style={[styles.container, isCurrentTurn && styles.active]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.stack}>
        <CardBack />
        <Text style={styles.count}>×{cardCount}</Text>
      </View>
      <TrickPile count={tricksWon} />
      <View style={styles.playedSlot}>{playedCard && <PlayingCard card={playedCard} />}</View>
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
  playedSlot: {
    marginTop: 8,
    height: CARD_HEIGHT, // reserved, so the table doesn't jump as cards are played this trick
    justifyContent: "center",
  },
});
