import type { ReactElement } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { HandHistoryEntry, PlayerIndex } from "rules-engine";
import { NEGATIVE_HAND_ORDER } from "rules-engine";
import { useTranslation } from "../i18n";

// HAND_SEQUENCE is fixed: all six negative hands, then all four positive hands — so the subtotal
// boundaries are fixed indices, not something to infer from neighboring entries. (A "does the next
// entry differ in kind" check breaks while handHistory is still partial: e.g. after hand 3, there
// is no hand 4 yet to compare against, so "index === length - 1" alone would fire the negative
// subtotal three hands too early.)
const LAST_NEGATIVE_INDEX = NEGATIVE_HAND_ORDER.length - 1;
const LAST_POSITIVE_INDEX = NEGATIVE_HAND_ORDER.length + 4 - 1;

const ALL_SEATS: PlayerIndex[] = [0, 1, 2, 3];

export interface ScoreboardProps {
  handHistory: HandHistoryEntry[];
  seatLabels: Record<PlayerIndex, string>;
}

function zeroTotals(): Record<PlayerIndex, number> {
  return { 0: 0, 1: 0, 2: 0, 3: 0 };
}

function ruleKey(entry: HandHistoryEntry): string {
  if (entry.handType !== "positive") return entry.handType;
  return entry.positiveSetup?.direction === "down" ? "positiveDown" : "positiveUp";
}

/**
 * A hand-by-hand results table — one row per hand played so far, one column per player, a rule
 * column showing each hand's scoring formula, plus negative/positive subtotal rows (once those
 * six/four hands are complete) and a grand Total — mirroring the family's King Scorekeeper.xlsx
 * pattern (CLAUDE.md: "each hand row checks that the four players' points sum to the hand's fixed
 * total... and a final row checks the whole game sums to zero") instead of expecting anyone to
 * remember 10 hands by heart.
 */
export function Scoreboard({ handHistory, seatLabels }: ScoreboardProps) {
  const { t } = useTranslation();
  const running = zeroTotals();
  const negativeSubtotal = zeroTotals();
  const positiveSubtotal = zeroTotals();
  const rows: ReactElement[] = [];

  handHistory.forEach((entry, index) => {
    const handName =
      entry.handType === "positive" ? t("rules:positiveHand.name") : t(`rules:negativeHands.${entry.handType}.name`);

    for (const seat of ALL_SEATS) {
      running[seat] += entry.scores[seat];
      if (entry.handType === "positive") positiveSubtotal[seat] += entry.scores[seat];
      else negativeSubtotal[seat] += entry.scores[seat];
    }

    rows.push(
      <View key={`hand-${index}`} style={styles.row}>
        <View style={[styles.cell, styles.handCell]}>
          <Text style={styles.handText} numberOfLines={1}>
            {index + 1}. {handName}
          </Text>
          <Text style={styles.ruleText} numberOfLines={1}>
            {t(`game:scoreboard.rule.${ruleKey(entry)}`)}
          </Text>
        </View>
        {ALL_SEATS.map((seat) => (
          <Text key={seat} style={styles.cell}>
            {entry.scores[seat]}
          </Text>
        ))}
      </View>,
    );

    if (index === LAST_NEGATIVE_INDEX) {
      rows.push(subtotalRow("neg-subtotal", t("game:scoreboard.negativeSubtotal"), negativeSubtotal));
    }
    if (index === LAST_POSITIVE_INDEX) {
      rows.push(subtotalRow("pos-subtotal", t("game:scoreboard.positiveSubtotal"), positiveSubtotal));
    }
  });

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
      {rows}
      <View style={[styles.row, styles.totalRow]}>
        <Text style={[styles.cell, styles.handCell, styles.totalText]}>{t("game:scoreboard.total")}</Text>
        {ALL_SEATS.map((seat) => (
          <Text key={seat} style={[styles.cell, styles.totalText]}>
            {running[seat]}
          </Text>
        ))}
      </View>
    </ScrollView>
  );
}

function subtotalRow(key: string, label: string, totals: Record<PlayerIndex, number>) {
  return (
    <View key={key} style={[styles.row, styles.subtotalRow]}>
      <Text style={[styles.cell, styles.handCell, styles.subtotalText]}>{label}</Text>
      {ALL_SEATS.map((seat) => (
        <Text key={seat} style={[styles.cell, styles.subtotalText]}>
          {totals[seat]}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    maxHeight: 360,
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
    flex: 2.4,
    alignItems: "flex-start",
    paddingRight: 4,
  },
  handText: {
    color: "#f5e6c8",
    fontSize: 13,
    textAlign: "left",
  },
  ruleText: {
    color: "#8fae9c",
    fontSize: 10,
    textAlign: "left",
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
  subtotalRow: {
    backgroundColor: "#0f4d38",
  },
  subtotalText: {
    fontWeight: "600",
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
