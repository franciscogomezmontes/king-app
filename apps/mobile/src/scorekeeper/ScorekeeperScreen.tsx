import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { HandType, NEGATIVE_HAND_EXPECTED_COUNT, PlayerIndex, POSITIVE_HAND_EXPECTED_TRICKS, validateHandCounts } from "rules-engine";
import {
  BackButton,
  Button,
  HandCountStepper,
  Scoreboard,
  ScoreboardEntry,
  SegmentedToggle,
  colors,
  fonts,
  layout,
  radii,
  spacing,
  typography,
  useTranslation,
} from "ui-kit";
import { ScorekeeperState, currentHandType, displayName, isGameComplete } from "./state";
import { useScorekeeper } from "./useScorekeeper";

const ALL_SEATS: PlayerIndex[] = [0, 1, 2, 3];

export interface ScorekeeperScreenProps {
  onExit: () => void;
}

function seatLabels(t: ReturnType<typeof useTranslation>["t"], state: ScorekeeperState): Record<PlayerIndex, string> {
  return {
    0: displayName(state, 0, t("scorekeeper:player", { number: 1 })),
    1: displayName(state, 1, t("scorekeeper:player", { number: 2 })),
    2: displayName(state, 2, t("scorekeeper:player", { number: 3 })),
    3: displayName(state, 3, t("scorekeeper:player", { number: 4 })),
  };
}

function toScoreboardEntries(state: ScorekeeperState): ScoreboardEntry[] {
  return state.history.map((entry) => ({
    handType: entry.handType,
    scores: entry.scores,
    positiveSetup: entry.direction !== null ? { direction: entry.direction } : null,
    valid: validateHandCounts(entry.handType, entry.counts).ok,
  }));
}

function expectedCountFor(handType: HandType): number {
  return handType === "positive" ? POSITIVE_HAND_EXPECTED_TRICKS : NEGATIVE_HAND_EXPECTED_COUNT[handType];
}

function questionKey(handType: HandType): string {
  return handType === "positive" ? "positive" : handType;
}

function handName(t: ReturnType<typeof useTranslation>["t"], handType: HandType): string {
  return handType === "positive" ? t("rules:positiveHand.name") : t(`rules:negativeHands.${handType}.name`);
}

/** Top-level Scorekeeper screen: a digital scorepad for 4 friends playing with physical cards —
 * no AI, no digital card play, just structured number entry per hand mirroring the family's
 * King Scorekeeper.xlsx, with a persistent session so a phone lock or browser refresh mid-game
 * night doesn't lose anyone's progress.
 *
 * Entry design (per the family's own feedback): the results table stays fully visible at all
 * times, with a fixed entry bar pinned below it — you never lose sight of where the game stands
 * while entering the hand that was just played. Each hand asks an explicit question ("How many
 * Hearts did each Player win?") rather than a bare label, so there's never ambiguity about
 * whether to enter a card count, a trick count, or points. Each player's count is a HandCountStepper
 * (+/- buttons, ui-kit), not free keyboard entry — this was the reverse of the family's first
 * instinct (typed numbers felt faster at first), but they came back around to +/- once they'd
 * played with it: it also caps itself at the hand's own real ceiling (`expectedCountFor` below),
 * so "+" simply stops responding once a player's count can't possibly go any higher for that hand
 * type, instead of letting you type an impossible value and only catching it on blur. */
export function ScorekeeperScreen({ onExit }: ScorekeeperScreenProps) {
  const { t } = useTranslation();
  const {
    loading,
    resumeCandidate,
    state,
    resume,
    startNew,
    setCount,
    setDirection,
    setPlayerName,
    setDate,
    confirmHand,
    editHand,
  } = useScorekeeper();
  const labels = seatLabels(t, state);
  const handType = currentHandType(state);
  const max = handType !== null ? expectedCountFor(handType) : 0;

  // Local, not persisted: dismisses the one-time names/date setup screen for this mount. Re-opening
  // the app before hand 1 is confirmed shows it again — a minor rough edge, not a data-loss risk.
  const [setupDismissed, setSetupDismissed] = useState(false);

  // "Go back and edit a past hand" — local-only until Save commits it via editHand, so cancelling
  // never touches the real session. Works whether the game is still in progress or already over
  // (both Scoreboards below wire onSelectHand the same way).
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editCounts, setEditCounts] = useState<Record<PlayerIndex, number>>({ 0: 0, 1: 0, 2: 0, 3: 0 });
  const [editDirection, setEditDirection] = useState<"up" | "down">("up");

  function startEdit(index: number) {
    const entry = state.history[index];
    if (entry === undefined) return;
    setEditCounts(entry.counts);
    setEditDirection(entry.direction ?? "up");
    setEditingIndex(index);
  }

  function saveEdit() {
    if (editingIndex === null) return;
    editHand(editingIndex, editCounts, editDirection);
    setEditingIndex(null);
  }

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

  if (editingIndex !== null) {
    const entry = state.history[editingIndex];
    // Shouldn't normally be reachable (startEdit only sets editingIndex for a real history entry),
    // but a safe fallback rather than rendering an edit form with nothing to edit.
    if (entry === undefined) return null;

    const editMax = expectedCountFor(entry.handType);
    const editValidation = validateHandCounts(entry.handType, editCounts);

    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.content, { maxWidth: layout.maxContentWidth }]}>
          <Text style={styles.hand}>{t("scorekeeper:hand", { number: editingIndex + 1 })}</Text>
          <Text style={styles.title}>{handName(t, entry.handType)}</Text>
          <Text style={styles.question}>{t(`scorekeeper:question.${questionKey(entry.handType)}`)}</Text>

          <View style={styles.fields}>
            {ALL_SEATS.map((seat) => (
              <HandCountStepper
                key={seat}
                label={labels[seat]}
                value={editCounts[seat]}
                max={editMax}
                onChange={(next) => setEditCounts((prev) => ({ ...prev, [seat]: next }))}
                decreaseLabel={t("scorekeeper:count.decrease", { name: labels[seat] })}
                increaseLabel={t("scorekeeper:count.increase", { name: labels[seat] })}
              />
            ))}
          </View>

          <Text style={[styles.validation, editValidation.ok ? styles.validationOk : styles.validationMismatch]}>
            {editValidation.ok
              ? t("scorekeeper:validation.ok")
              : t("scorekeeper:validation.mismatch", { expected: editValidation.expectedTotal })}
          </Text>

          {entry.handType === "positive" && (
            <View style={styles.toggle}>
              <SegmentedToggle
                label={t("scorekeeper:direction.prompt")}
                value={editDirection}
                onChange={setEditDirection}
                options={[
                  { value: "up", label: t("rules:playingDirection.up") },
                  { value: "down", label: t("rules:playingDirection.down") },
                ]}
              />
            </View>
          )}

          <Button label={t("scorekeeper:edit.save")} onPress={saveEdit} />
          <Button label={t("scorekeeper:edit.cancel")} onPress={() => setEditingIndex(null)} variant="ghost" />
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
          <View style={styles.header}>
            <BackButton onPress={onExit} label={t("scorekeeper:backToMenu")} />
          </View>
          <Text style={styles.title}>{t("scorekeeper:gameOver")}</Text>
          <Text style={styles.winnerText}>{winnerLine}</Text>
          <Scoreboard handHistory={toScoreboardEntries(state)} seatLabels={labels} onSelectHand={startEdit} />
          <Button label={t("scorekeeper:newGame")} onPress={startNew} />
        </View>
      </SafeAreaView>
    );
  }

  if (handType === null) {
    // Shouldn't normally be reachable (isGameComplete catches it first), but a safe fallback
    // rather than rendering an entry form with no hand to enter.
    return null;
  }

  // A brand-new game (nothing confirmed yet) offers to name the players and set the date before
  // hand 1 — both optional (leaving a name blank keeps "Player N"), both editable later from a
  // saved game's history entry is out of scope for now, but nothing here is destructive to redo.
  if (state.history.length === 0 && !setupDismissed) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.content, { maxWidth: layout.maxContentWidth }]}>
          <View style={styles.header}>
            <BackButton onPress={onExit} label={t("scorekeeper:backToMenu")} />
          </View>
          <Text style={styles.title}>{t("scorekeeper:setup.title")}</Text>

          <View style={styles.setupField}>
            <Text style={styles.setupLabel}>{t("scorekeeper:setup.date")}</Text>
            <TextInput
              style={styles.dateInput}
              value={state.date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.muted}
            />
          </View>

          {ALL_SEATS.map((seat) => (
            <View key={seat} style={styles.setupField}>
              <Text style={styles.setupLabel}>{t("scorekeeper:player", { number: seat + 1 })}</Text>
              <TextInput
                style={styles.nameInput}
                value={state.playerNames[seat]}
                onChangeText={(text) => setPlayerName(seat, text)}
                placeholder={t("scorekeeper:player", { number: seat + 1 })}
                placeholderTextColor={colors.muted}
                returnKeyType={seat === 3 ? "done" : "next"}
              />
            </View>
          ))}

          <Text style={styles.setupHint}>{t("scorekeeper:setup.namesHint")}</Text>

          <Button label={t("scorekeeper:setup.start")} onPress={() => setSetupDismissed(true)} />
        </View>
      </SafeAreaView>
    );
  }

  const validation = validateHandCounts(handType, state.draftCounts);

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.content, { maxWidth: layout.maxContentWidth }]}>
        <View style={styles.header}>
          <BackButton onPress={onExit} label={t("scorekeeper:backToMenu")} />
        </View>

        <View style={styles.boardArea}>
          <Scoreboard handHistory={toScoreboardEntries(state)} seatLabels={labels} onSelectHand={startEdit} />
        </View>

        <View style={styles.entryBar}>
          <Text style={styles.hand}>{t("scorekeeper:hand", { number: state.handIndex + 1 })}</Text>
          <Text style={styles.title}>{handName(t, handType)}</Text>
          <Text style={styles.question}>{t(`scorekeeper:question.${questionKey(handType)}`)}</Text>

          <View style={styles.fields}>
            {ALL_SEATS.map((seat) => (
              <HandCountStepper
                key={seat}
                label={labels[seat]}
                value={state.draftCounts[seat]}
                max={max}
                onChange={(next) => setCount(seat, next)}
                decreaseLabel={t("scorekeeper:count.decrease", { name: labels[seat] })}
                increaseLabel={t("scorekeeper:count.increase", { name: labels[seat] })}
              />
            ))}
          </View>

          <Text style={[styles.validation, validation.ok ? styles.validationOk : styles.validationMismatch]}>
            {validation.ok
              ? t("scorekeeper:validation.ok")
              : t("scorekeeper:validation.mismatch", { expected: validation.expectedTotal })}
          </Text>

          {handType === "positive" && (
            <View style={styles.toggle}>
              <SegmentedToggle
                label={t("scorekeeper:direction.prompt")}
                value={state.draftDirection}
                onChange={setDirection}
                options={[
                  { value: "up", label: t("rules:playingDirection.up") },
                  { value: "down", label: t("rules:playingDirection.down") },
                ]}
              />
            </View>
          )}

          <Button label={t("scorekeeper:confirmHand")} onPress={confirmHand} />
        </View>
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
    flex: 1,
    alignSelf: "center",
    alignItems: "center",
  },
  header: {
    width: "100%",
    marginBottom: spacing.sm,
    alignItems: "flex-start",
  },
  // Takes all the vertical space the entry bar below doesn't need — the results table scrolls
  // within this area while the entry bar itself never moves, per the family's request to always
  // see the complete scoreboard.
  boardArea: {
    width: "100%",
    flex: 1,
  },
  entryBar: {
    width: "100%",
    borderTopWidth: 1,
    borderTopColor: colors.goldMuted,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    alignItems: "center",
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
  question: {
    color: colors.secondaryText,
    fontFamily: fonts.body,
    fontSize: 13,
    marginTop: 4,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  body: {
    ...typography.body,
    textAlign: "center",
    marginBottom: 20,
  },
  fields: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
    width: "100%",
  },
  validation: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    marginTop: spacing.md,
    textAlign: "center",
  },
  validationOk: {
    color: colors.validationOk,
  },
  validationMismatch: {
    color: colors.validationWarn,
  },
  toggle: {
    marginTop: spacing.sm,
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
  setupField: {
    width: "100%",
    maxWidth: 320,
    marginBottom: spacing.sm,
  },
  setupLabel: {
    color: colors.secondaryText,
    fontFamily: fonts.body,
    fontSize: 12,
    marginBottom: 4,
  },
  nameInput: {
    width: "100%",
    color: colors.ink,
    backgroundColor: colors.cream,
    fontFamily: fonts.bodySemi,
    fontSize: 16,
    borderRadius: radii.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
  },
  dateInput: {
    width: "100%",
    color: colors.ink,
    backgroundColor: colors.cream,
    fontFamily: fonts.bodySemi,
    fontSize: 16,
    borderRadius: radii.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
  },
  setupHint: {
    ...typography.caption,
    textAlign: "center",
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
});
