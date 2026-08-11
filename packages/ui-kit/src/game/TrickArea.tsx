import { StyleSheet, Text, View } from "react-native";
import type { Card, PlayerIndex } from "rules-engine";
import { PlayingCard } from "./PlayingCard";

export interface TrickAreaProps {
  plays: { player: PlayerIndex; card: Card }[];
  seatLabels: Record<PlayerIndex, string>;
}

/** The current trick in progress: up to 4 cards, each labeled with who played it. */
export function TrickArea({ plays, seatLabels }: TrickAreaProps) {
  return (
    <View style={styles.container}>
      {plays.length === 0 ? (
        <Text style={styles.empty}>—</Text>
      ) : (
        plays.map(({ player, card }) => (
          <View key={player} style={styles.play}>
            <Text style={styles.seatLabel}>{seatLabels[player]}</Text>
            <PlayingCard card={card} />
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
    gap: 12,
    minHeight: 100,
  },
  play: {
    alignItems: "center",
  },
  seatLabel: {
    color: "#c9d8cf",
    fontSize: 11,
    marginBottom: 4,
  },
  empty: {
    color: "#8fae9c",
    fontSize: 14,
  },
});
