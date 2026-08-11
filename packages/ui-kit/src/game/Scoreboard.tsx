import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { HandHistoryEntry, PlayerIndex } from "rules-engine";
import { useTranslation } from "../i18n";

const ALL_SEATS: PlayerIndex[] = [0, 1, 2, 3];

export interface ScoreboardProps {
  handHistory: HandHistoryEntry[];
  seatLabels: Record<PlayerIndex, string>;
}

/**
 * A hand-by-hand results table — one row per hand played so far, one column per player, plus a
 * running-total row — mirroring the family's King Scorekeeper.xlsx pattern (CLAUDE.md: "each hand
 * row checks that the four players' points sum to the hand's fixed total... and a final row
 * checks the whole game sums to zero") instead of expecting anyone to remember 10 hands by heart.
 */
export function Scoreboard({ handHistory, seatLabels }: ScoreboardProps) {
  const { t } = useTranslation();
  const totals: Record<PlayerIndex, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.row}>
        <Text style={[styles.cell, styles.handCell, styles.headerText]} />
        {ALL_SEATS.map((seat) => (
          <Text key={seat} style={[styles.cell, styles.headerText]} numberOfLines={1}>
            {seatLabels[seat]}
          </Text>
        ))}
      </View>
      {handHistory.map((entry, index) => {
        const handName =
          entry.handType === "positive" ? t("rules:positiveHand.name") : t(`rules:negativeHands.${entry.handType}.name`);
        for (const seat of ALL_SEATS) totals[seat] += entry.scores[seat];
        return (
          <View key={index} style={styles.row}>
            <Text style={[styles.cell, styles.handCell]} numberOfLines={1}>
              {index + 1}. {handName}
            </Text>
            {ALL_SEATS.map((seat) => (
              <Text key={seat} style={styles.cell}>
                {entry.scores[seat]}
              </Text>
            ))}
          </View>
        );
      })}
      <View style={[styles.row, styles.totalRow]}>
        <Text style={[styles.cell, styles.handCell, styles.totalText]}>{t("game:scoreboard.total")}</Text>
        {ALL_SEATS.map((seat) => (
          <Text key={seat} style={[styles.cell, styles.totalText]}>
            {totals[seat]}
          </Text>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    maxHeight: 320,
    marginVertical: 8,
  },
  content: {
    paddingVertical: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#1c7a53",
  },
  handCell: {
    flex: 2,
    textAlign: "left",
    paddingRight: 4,
  },
  cell: {
    flex: 1,
    color: "#f5e6c8",
    fontSize: 13,
    textAlign: "center",
  },
  headerText: {
    fontWeight: "700",
    color: "#c9d8cf",
    fontSize: 12,
  },
  totalRow: {
    borderBottomWidth: 0,
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 2,
    borderTopColor: "#f2c14e",
  },
  totalText: {
    fontWeight: "700",
    color: "#f2c14e",
  },
});
