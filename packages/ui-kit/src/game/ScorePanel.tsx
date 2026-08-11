import { StyleSheet, Text, View } from "react-native";
import type { HandType, PlayerIndex } from "rules-engine";
import { useTranslation } from "../i18n";

export interface ScorePanelProps {
  handType: HandType;
  /** 1-10. */
  handNumber: number;
  scores: Record<PlayerIndex, number>;
  seatLabels: Record<PlayerIndex, string>;
}

/** Current hand name (via ui-kit's own "rules" i18n namespace) plus every player's running score. */
export function ScorePanel({ handType, handNumber, scores, seatLabels }: ScorePanelProps) {
  const { t } = useTranslation();
  const handName =
    handType === "positive" ? t("rules:positiveHand.name") : t(`rules:negativeHands.${handType}.name`);

  return (
    <View style={styles.container}>
      <Text style={styles.handName}>
        {handNumber}/10 — {handName}
      </Text>
      <View style={styles.scores}>
        {([0, 1, 2, 3] as PlayerIndex[]).map((player) => (
          <Text key={player} style={styles.score}>
            {seatLabels[player]}: {scores[player]}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginBottom: 8,
  },
  handName: {
    color: "#f5e6c8",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  scores: {
    flexDirection: "row",
    gap: 12,
  },
  score: {
    color: "#c9d8cf",
    fontSize: 13,
  },
});
