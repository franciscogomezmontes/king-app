import { useState } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { HandType, NEGATIVE_HAND_EXPECTED_COUNT, PlayerIndex, POSITIVE_HAND_EXPECTED_TRICKS, validateHandCounts } from "rules-engine";
import { CountStepper, Scoreboard, ScoreboardEntry, useTranslation } from "ui-kit";
import { ScorekeeperState, currentHandType, isGameComplete } from "./state";
import { useScorekeeper } from "./useScorekeeper";

const ALL_SEATS: PlayerIndex[] = [0, 1, 2, 3];

// Matches App.tsx's mode picker / GameScreen's own cap — stays compact on a phone, doesn't stretch
// edge-to-edge on a wide desktop browser.
const MAX_CONTENT_WIDTH = 480;

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
        <View style={[styles.content, { maxWidth: MAX_CONTENT_WIDTH }]}>
          <Text style={styles.title}>{t("scorekeeper:resume.title")}</Text>
          <Text style={styles.body}>{t("scorekeeper:resume.body")}</Text>
          <Pressable style={styles.primaryButton} onPress={resume}>
            <Text style={styles.primaryButtonLabel}>{t("scorekeeper:resume.resume")}</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={startNew}>
            <Text style={styles.secondaryButtonLabel}>{t("scorekeeper:resume.startNew")}</Text>
          </Pressable>
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
        <View style={[styles.content, { maxWidth: MAX_CONTENT_WIDTH }]}>
          <Text style={styles.title}>{t("scorekeeper:gameOver")}</Text>
          <Text style={styles.winnerText}>{winnerLine}</Text>
          <Scoreboard handHistory={toScoreboardEntries(state)} seatLabels={labels} />
          <Pressable
            style={styles.primaryButton}
            onPress={() => {
              startNew();
              setShowingCheckpoint(false);
            }}
          >
            <Text style={styles.primaryButtonLabel}>{t("scorekeeper:newGame")}</Text>
          </Pressable>
          <Pressable style={styles.linkButton} onPress={onExit}>
            <Text style={styles.linkButtonLabel}>{t("scorekeeper:backToMenu")}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (showingCheckpoint) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.content, { maxWidth: MAX_CONTENT_WIDTH }]}>
          <Text style={styles.title}>{t("scorekeeper:hand", { number: state.handIndex })}</Text>
          <Scoreboard handHistory={toScoreboardEntries(state)} seatLabels={labels} />
          <Pressable style={styles.primaryButton} onPress={() => setShowingCheckpoint(false)}>
            <Text style={styles.primaryButtonLabel}>{t("scorekeeper:nextHand")}</Text>
          </Pressable>
          <Pressable style={styles.linkButton} onPress={onExit}>
            <Text style={styles.linkButtonLabel}>{t("scorekeeper:backToMenu")}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const handType = currentHandType(state);
  if (handType === null) {
    // isGameComplete but the checkpoint already closed — shouldn't normally be reachable (the
    // game-complete branch above catches it first right after the final confirm), but keep this
    // as a safe fallback rather than rendering an entry form with no hand to enter.
    return null;
  }

  const max = expectedCountFor(handType);
  const validation = validateHandCounts(handType, state.draftCounts);

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.content, { maxWidth: MAX_CONTENT_WIDTH }]}>
        <View style={styles.header}>
          <Pressable onPress={onExit}>
            <Text style={styles.linkButtonLabel}>{t("scorekeeper:backToMenu")}</Text>
          </Pressable>
        </View>
        <Text style={styles.hand}>{t("scorekeeper:hand", { number: state.handIndex + 1 })}</Text>
        <Text style={styles.title}>{handName(t, handType)}</Text>
        <Text style={styles.unitLabel}>{t(`scorekeeper:unitLabel.${unitLabelKey(handType)}`)}</Text>

        <View style={styles.steppers}>
          {ALL_SEATS.map((seat) => (
            <CountStepper
              key={seat}
              label={labels[seat]}
              value={state.draftCounts[seat]}
              max={max}
              onChange={(value) => setCount(seat, value)}
            />
          ))}
        </View>

        <Text style={[styles.validation, validation.ok ? styles.validationOk : styles.validationMismatch]}>
          {validation.ok
            ? t("scorekeeper:validation.ok")
            : t("scorekeeper:validation.mismatch", { expected: validation.expectedTotal })}
        </Text>

        {handType === "positive" && (
          <Pressable style={styles.toggle} onPress={() => setDirection(state.draftDirection === "up" ? "down" : "up")}>
            <Text style={styles.toggleLabel}>
              {t("scorekeeper:direction.prompt")}:{" "}
              {state.draftDirection === "up" ? t("rules:playingDirection.up") : t("rules:playingDirection.down")}
            </Text>
          </Pressable>
        )}

        <Pressable
          style={styles.primaryButton}
          onPress={() => {
            confirmHand();
            setShowingCheckpoint(true);
          }}
        >
          <Text style={styles.primaryButtonLabel}>{t("scorekeeper:confirmHand")}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b3d2e",
    alignItems: "center",
    paddingTop: 48,
    paddingHorizontal: 16,
  },
  content: {
    width: "100%",
    alignSelf: "center",
    alignItems: "center",
  },
  header: {
    width: "100%",
    marginBottom: 8,
  },
  hand: {
    color: "#8fae9c",
    fontSize: 13,
    fontWeight: "600",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#f5e6c8",
    textAlign: "center",
    marginTop: 2,
  },
  unitLabel: {
    color: "#c9d8cf",
    fontSize: 13,
    marginTop: 4,
    marginBottom: 16,
    textAlign: "center",
  },
  body: {
    color: "#c9d8cf",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
  },
  steppers: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 20,
    width: "100%",
  },
  validation: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 16,
    textAlign: "center",
  },
  validationOk: {
    color: "#4caf50",
  },
  validationMismatch: {
    color: "#e0a53a",
  },
  toggle: {
    marginTop: 12,
    paddingVertical: 4,
  },
  toggleLabel: {
    color: "#c9d8cf",
    fontSize: 13,
  },
  primaryButton: {
    backgroundColor: "#0f4d38",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginVertical: 8,
    minWidth: 160,
    alignItems: "center",
  },
  primaryButtonLabel: {
    color: "#f5e6c8",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    backgroundColor: "#1c7a53",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  secondaryButtonLabel: {
    color: "#f5e6c8",
    fontWeight: "600",
  },
  linkButton: {
    marginTop: 16,
  },
  linkButtonLabel: {
    color: "#8fae9c",
    fontSize: 14,
  },
  winnerText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f2c14e",
    marginBottom: 12,
    textAlign: "center",
  },
});
