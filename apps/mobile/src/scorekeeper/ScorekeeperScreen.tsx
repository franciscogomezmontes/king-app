import { useState } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { HandType, NEGATIVE_HAND_EXPECTED_COUNT, PlayerIndex, POSITIVE_HAND_EXPECTED_TRICKS, validateHandCounts } from "rules-engine";
import { Button, CountStepper, Scoreboard, ScoreboardEntry, colors, fonts, layout, spacing, typography, useTranslation } from "ui-kit";
import { ScorekeeperState, currentHandType, isGameComplete } from "./state";
import { useScorekeeper } from "./useScorekeeper";

const ALL_SEATS: PlayerIndex[] = [0, 1, 2, 3];

export interface ScorekeeperScreenProps {
  onExit: () => void;
}

function seatLabels(t: ReturnType<typeof useTranslation>["t"]): Record<PlayerIndex, string> {
  return {
    0: t("scorekeeper:player", { number: 1 }),
    1: t("scorekeeper:player", { number: 2 }),
    2: t("scorekeeper:player", { number: 3 }),
    3: t("scorekeeper:player", { number: 4 }),
  };
}

function toScoreboardEntries(state: ScorekeeperState): ScoreboardEntry[] {
  return state.history.map((entry) => ({
    handType: entry.handType,
    scores: entry.scores,
    positiveSetup: entry.direction !== null ? { direction: entry.direction } : null,
  }));
}

function expectedCountFor(handType: HandType): number {
  return handType === "positive" ? POSITIVE_HAND_EXPECTED_TRICKS : NEGATIVE_HAND_EXPECTED_COUNT[handType];
}

function unitLabelKey(handType: HandType): string {
  return handType === "positive" ? "positive" : handType;
}

function handName(t: ReturnType<typeof useTranslation>["t"], handType: HandType): string {
  return handType === "positive" ? t("rules:positiveHand.name") : t(`rules:negativeHands.${handType}.name`);
}

function assignedTotal(draftCounts: Record<PlayerIndex, number>): number {
  return ALL_SEATS.reduce((sum, seat) => sum + draftCounts[seat], 0);
}

/** Top-level Scorekeeper screen: a digital scorepad for 4 friends playing with physical cards —
 * no AI, no digital card play, just structured number entry per hand mirroring the family's
 * King Scorekeeper.xlsx, with a persistent session so a phone lock or browser refresh mid-game
 * night doesn't lose anyone's progress. */
export function ScorekeeperScreen({ onExit }: ScorekeeperScreenProps) {
  const { t } = useTranslation();
  const { loading, resumeCandidate, state, resume, startNew, setCount, setDirection, confirmHand } =
    useScorekeeper();
  const [showingCheckpoint, setShowingCheckpoint] = useState(false);
  const labels = seatLabels(t);

  if (loading) {
    return <SafeAreaView style={styles.container} />;
  }

  if (resumeCandidate !== null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.content, { maxWidth: layout.maxContentWidth }]}>
          <Text style={styles.title}>{t("scorekeeper:resume.title")}</Text>
          <Text style={styles.body}>{t("scorekeeper:resume.body")}</Text>
          <Button label={t("scorekeeper:resume.resume")} onPress={resume} />
          <Button label={t("scorekeeper:resume.startNew")} onPress={startNew} variant="secondary" />
        </View>
      </SafeAreaView>
    );
  }

  if (isGameComplete(state)) {
    const bestScore = Math.max(...ALL_SEATS.map((seat) => state.cumulativeScores[seat]));
    const winners = ALL_SEATS.filter((seat) => state.cumulativeScores[seat] === bestScore);
    const winnerLine =
      winners.length === 1
        ? t("scorekeeper:winner", { name: labels[winners[0]] })
        : t("scorekeeper:tie", { names: winners.map((seat) => labels[seat]).join(", ") });

    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.content, { maxWidth: layout.maxContentWidth }]}>
          <Text style={styles.title}>{t("scorekeeper:gameOver")}</Text>
          <Text style={styles.winnerText}>{winnerLine}</Text>
          <Scoreboard handHistory={toScoreboardEntries(state)} seatLabels={labels} />
          <Button
            label={t("scorekeeper:newGame")}
            onPress={() => {
              startNew();
              setShowingCheckpoint(false);
            }}
          />
          <Button label={t("scorekeeper:backToMenu")} onPress={onExit} variant="ghost" />
        </View>
      </SafeAreaView>
    );
  }

  if (showingCheckpoint) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.content, { maxWidth: layout.maxContentWidth }]}>
          <Text style={styles.title}>{t("scorekeeper:hand", { number: state.handIndex })}</Text>
          <Scoreboard handHistory={toScoreboardEntries(state)} seatLabels={labels} />
          <Button label={t("scorekeeper:nextHand")} onPress={() => setShowingCheckpoint(false)} />
          <Button label={t("scorekeeper:backToMenu")} onPress={onExit} variant="ghost" />
        </View>
      </SafeAreaView>
    );
  }

  const handType = currentHandType(state);
  if (handType === null) {
    return null;
  }

  const max = expectedCountFor(handType);
  const validation = validateHandCounts(handType, state.draftCounts);
  const assigned = assignedTotal(state.draftCounts);
  const left = validation.expectedTotal - assigned;
  const validationCopy =
    left > 0
      ? t("scorekeeper:validation.remaining", { count: left })
      : left === 0 && validation.ok
        ? t("scorekeeper:validation.ok", { expected: validation.expectedTotal })
        : t("scorekeeper:validation.mismatch", {
            count: Math.abs(left),
            expected: validation.expectedTotal,
          });
  const validationTone = left > 0 ? styles.validationPending : validation.ok ? styles.validationOk : styles.validationMismatch;

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.content, { maxWidth: layout.maxContentWidth }]}>
        <View style={styles.header}>
          <Button label={t("scorekeeper:backToMenu")} onPress={onExit} variant="ghost" style={styles.headerLink} />
        </View>
        <Text style={styles.hand}>{t("scorekeeper:hand", { number: state.handIndex + 1 })}</Text>
        <Text style={styles.title}>{handName(t, handType)}</Text>
        <Text style={styles.unitLabel}>{t(`scorekeeper:unitLabel.${unitLabelKey(handType)}`)}</Text>

        <View style={styles.grid}>
          <View style={styles.padRow}>
            <CountStepper label={labels[0]} value={state.draftCounts[0]} max={max} onChange={(value) => setCount(0, value)} />
            <CountStepper label={labels[1]} value={state.draftCounts[1]} max={max} onChange={(value) => setCount(1, value)} />
          </View>
          <View style={styles.padRow}>
            <CountStepper label={labels[2]} value={state.draftCounts[2]} max={max} onChange={(value) => setCount(2, value)} />
            <CountStepper label={labels[3]} value={state.draftCounts[3]} max={max} onChange={(value) => setCount(3, value)} />
          </View>
        </View>

        <Text style={[styles.validation, validationTone]}>{validationCopy}</Text>

        {handType === "positive" && (
          <Pressable style={styles.toggle} onPress={() => setDirection(state.draftDirection === "up" ? "down" : "up")}>
            <Text style={styles.toggleLabel}>
              {t("scorekeeper:direction.prompt")}:{" "}
              {state.draftDirection === "up" ? t("rules:playingDirection.up") : t("rules:playingDirection.down")}
            </Text>
          </Pressable>
        )}

        <Button
          label={t("scorekeeper:confirmHand")}
          onPress={() => {
            confirmHand();
            setShowingCheckpoint(true);
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.felt,
    alignItems: "center",
    paddingTop: 48,
    paddingHorizontal: spacing.lg,
  },
  content: {
    width: "100%",
    alignSelf: "center",
    alignItems: "center",
  },
  header: {
    width: "100%",
    marginBottom: spacing.sm,
    alignItems: "flex-start",
  },
  headerLink: {
    minWidth: 0,
    paddingHorizontal: 0,
    alignSelf: "flex-start",
  },
  hand: {
    color: colors.muted,
    fontFamily: fonts.bodySemi,
    fontSize: 13,
  },
  title: {
    ...typography.title,
    textAlign: "center",
    marginTop: 2,
  },
  unitLabel: {
    color: colors.secondaryText,
    fontFamily: fonts.body,
    fontSize: 13,
    marginTop: 4,
    marginBottom: spacing.lg,
    textAlign: "center",
  },
  body: {
    ...typography.body,
    textAlign: "center",
    marginBottom: 20,
  },
  grid: {
    width: "100%",
    gap: 10,
  },
  padRow: {
    flexDirection: "row",
    width: "100%",
    gap: 10,
  },
  validation: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    marginTop: spacing.lg,
    textAlign: "center",
  },
  validationPending: {
    color: colors.gold,
  },
  validationOk: {
    color: colors.validationOk,
  },
  validationMismatch: {
    color: colors.validationWarn,
  },
  toggle: {
    marginTop: spacing.md,
    paddingVertical: 4,
  },
  toggleLabel: {
    color: colors.secondaryText,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  winnerText: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.gold,
    marginBottom: spacing.md,
    textAlign: "center",
  },
});
