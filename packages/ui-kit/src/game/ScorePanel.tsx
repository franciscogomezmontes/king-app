import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { HandType, PlayerIndex } from "rules-engine";
import { useTranslation } from "../i18n";
import { colors, fonts, spacing } from "../theme";
import { InfoTooltip } from "../primitives/InfoTooltip";
import { ScoreProgress } from "./ScoreProgress";

export interface ScorePanelProps {
  handType: HandType;
  /** 1-10. */
  handNumber: number;
  scores: Record<PlayerIndex, number>;
  seatLabels: Record<PlayerIndex, string>;
  /** Whether to render the running-score progress bars below the hand name (see ScoreProgress).
   * Defaults to true; callers wire this to the player's own "show score summary" setting, off by
   * default there to reclaim table space (see apps/mobile's settings/types.ts). The hand name row
   * itself (plus its info badge and Trump-hand numeral) always renders regardless. */
  showProgress?: boolean;
}

// Positive hands are handNumber 7-10 (handIndex 6-9, see rules-engine's HAND_SEQUENCE) — this is
// the "which of the 4 Trump hands is this" a player asked for, distinct from the overall 1-10
// hand progress ScoreProgress's own bar already shows. Roman numerals are locale-invariant, so
// this is a plain lookup, not an i18n key.
const POSITIVE_HAND_NUMERALS = ["I", "II", "III", "IV"];

function positiveHandNumeral(handNumber: number): string | null {
  const index = handNumber - 7;
  return index >= 0 && index < POSITIVE_HAND_NUMERALS.length ? POSITIVE_HAND_NUMERALS[index] : null;
}

/** Current hand name (via ui-kit's own "rules" i18n namespace) plus every player's running score,
 * as progress bars (see ScoreProgress) rather than bare numbers. An "(i)" badge next to the name
 * reveals that hand type's rules on tap (see InfoTooltip) instead of the app permanently
 * dedicating screen space to an explanation most returning players no longer need. */
export function ScorePanel({ handType, handNumber, scores, seatLabels, showProgress = true }: ScorePanelProps) {
  const { t } = useTranslation();
  const [infoOpen, setInfoOpen] = useState(false);
  const handName =
    handType === "positive" ? t("rules:positiveHand.name") : t(`rules:negativeHands.${handType}.name`);
  const description =
    handType === "positive" ? t("rules:positiveHand.description") : t(`rules:negativeHands.${handType}.description`);
  const numeral = handType === "positive" ? positiveHandNumeral(handNumber) : null;

  return (
    // Elevated above the table felt below it (a later sibling in GameScreen/OnlineScreen) only
    // while the info tooltip is actually open — an absolutely positioned child can't out-rank an
    // element outside its own parent's stacking context on its own; the *container* has to be the
    // one raised. See InfoTooltip's own `open` doc comment.
    <View style={[styles.container, infoOpen && styles.containerElevated]}>
      {/* The overall hand *number* (1-10) lives in ScoreProgress's own progress bar below, so this
          row only names the hand type (plus, for a Trump hand, which of the 4 it is) — showing
          "3/10" in two places on the same panel read as a bug. */}
      <View style={styles.handNameRow}>
        {numeral !== null && <Text style={styles.handNumeral}>{numeral}</Text>}
        <Text style={styles.handName}>{handName}</Text>
        <InfoTooltip
          content={description}
          label={t("rules:infoLabel", { name: handName })}
          open={infoOpen}
          onToggle={() => setInfoOpen((o) => !o)}
        />
      </View>
      {showProgress && <ScoreProgress handNumber={handNumber} scores={scores} seatLabels={seatLabels} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  containerElevated: {
    zIndex: 100,
    elevation: 16,
  },
  handNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: 4,
  },
  handNumeral: {
    color: colors.gold,
    fontFamily: fonts.displaySemi,
    fontSize: 14,
  },
  handName: {
    color: colors.cream,
    fontFamily: fonts.displaySemi,
    fontSize: 16,
  },
});
