import { StyleSheet, Text, View } from "react-native";
import type { HandType, PlayerIndex } from "rules-engine";
import { useTranslation } from "../i18n";
import { colors, fonts, spacing } from "../theme";
import { ScoreProgress } from "./ScoreProgress";

export interface ScorePanelProps {
  handType: HandType;
  /** 1-10. */
  handNumber: number;
  scores: Record<PlayerIndex, number>;
  seatLabels: Record<PlayerIndex, string>;
}

/** Current hand name (via ui-kit's own "rules" i18n namespace) plus every player's running score,
 * as progress bars (see ScoreProgress) rather than bare numbers. */
export function ScorePanel({ handType, handNumber, scores, seatLabels }: ScorePanelProps) {
  const { t } = useTranslation();
  const handName =
    handType === "positive" ? t("rules:positiveHand.name") : t(`rules:negativeHands.${handType}.name`);

  return (
    <View style={styles.container}>
      {/* The hand *number* now lives in ScoreProgress's own progress bar below, so this only
          names the hand type — showing "3/10" in two places on the same panel read as a bug. */}
      <Text style={styles.handName}>{handName}</Text>
      <ScoreProgress handNumber={handNumber} scores={scores} seatLabels={seatLabels} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  handName: {
    color: colors.cream,
    fontFamily: fonts.displaySemi,
    fontSize: 16,
    marginBottom: 4,
  },
});
