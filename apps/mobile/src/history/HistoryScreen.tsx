import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { PlayerIndex } from "rules-engine";
import { BackButton, Button, Scoreboard, Surface, colors, fonts, layout, spacing, typography, useTranslation } from "ui-kit";
import { clearAllCompletedGames, deleteCompletedGame, loadCompletedGames } from "./persistence";
import type { CompletedGame } from "./types";

const ALL_SEATS: PlayerIndex[] = [0, 1, 2, 3];

export interface HistoryScreenProps {
  onExit: () => void;
}

function winnerLine(
  t: ReturnType<typeof useTranslation>["t"],
  game: CompletedGame,
): string {
  const bestScore = Math.max(...ALL_SEATS.map((seat) => game.finalScores[seat]));
  const winners = ALL_SEATS.filter((seat) => game.finalScores[seat] === bestScore);
  return winners.length === 1
    ? t("history:winner", { name: game.playerNames[winners[0]] })
    : t("history:tie", { names: winners.map((seat) => game.playerNames[seat]).join(", ") });
}

/** A shared archive of finished games, regardless of which mode produced them — Scorekeeper
 * (physical cards), Solo vs Computer, and Online all write to the same store (see
 * `apps/mobile/src/history/persistence.ts`), so a game night's paper scores and a solo practice
 * session against the bots show up in the same place. Deleting (one game, or the whole list) uses
 * an inline "are you sure?" confirm instead of a native Alert/Modal — consistent with how the rest
 * of this app avoids Modal (see king-cross-platform-ui: it behaves inconsistently across Web/
 * Android/iOS), and deletion here only removes the LOCAL record, never anything already shared
 * with other devices (there's no shared/cloud history in this app yet). */
export function HistoryScreen({ onExit }: HistoryScreenProps) {
  const { t } = useTranslation();
  const [games, setGames] = useState<CompletedGame[] | null>(null);
  const [selected, setSelected] = useState<CompletedGame | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadCompletedGames().then((loaded) => {
      if (!cancelled) setGames(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleDelete(id: string) {
    await deleteCompletedGame(id);
    setGames((prev) => (prev ?? []).filter((g) => g.id !== id));
    setConfirmDeleteId(null);
  }

  async function handleClearAll() {
    await clearAllCompletedGames();
    setGames([]);
    setConfirmClearAll(false);
  }

  if (selected !== null) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={[styles.content, { maxWidth: layout.maxContentWidth }]}
        >
          <View style={styles.header}>
            <BackButton onPress={() => setSelected(null)} label={t("history:back")} />
          </View>
          <Text style={styles.title}>{t(`history:modeLabel.${selected.mode}`)}</Text>
          <Text style={styles.date}>{selected.date}</Text>
          <Text style={styles.winnerText}>{winnerLine(t, selected)}</Text>
          <Scoreboard handHistory={selected.handHistory} seatLabels={selected.playerNames} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[styles.content, { maxWidth: layout.maxContentWidth }]}
      >
        <View style={styles.header}>
          <BackButton onPress={onExit} label={t("history:backToMenu")} />
        </View>
        <Text style={styles.title}>{t("history:title")}</Text>

        {games !== null && games.length === 0 && <Text style={styles.empty}>{t("history:empty")}</Text>}

        <View style={styles.list}>
          {(games ?? []).map((game) =>
            confirmDeleteId === game.id ? (
              <Surface key={game.id} style={styles.gameCard}>
                <Text style={styles.confirmText}>{t("history:confirmDelete")}</Text>
                <View style={styles.confirmRow}>
                  <Button
                    label={t("history:deleteConfirm")}
                    onPress={() => handleDelete(game.id)}
                    variant="secondary"
                    style={styles.confirmButton}
                  />
                  <Button
                    label={t("history:deleteCancel")}
                    onPress={() => setConfirmDeleteId(null)}
                    variant="ghost"
                    style={styles.confirmButton}
                  />
                </View>
              </Surface>
            ) : (
              <Surface key={game.id} style={[styles.gameCard, styles.gameCardRow]}>
                <Pressable style={styles.gameCardMain} onPress={() => setSelected(game)}>
                  <View style={styles.gameCardHeader}>
                    <Text style={styles.gameCardMode}>{t(`history:modeLabel.${game.mode}`)}</Text>
                    <Text style={styles.gameCardDate}>{game.date}</Text>
                  </View>
                  <Text style={styles.gameCardWinner}>{winnerLine(t, game)}</Text>
                </Pressable>
                <Pressable onPress={() => setConfirmDeleteId(game.id)} style={styles.deleteButton} hitSlop={8}>
                  <Text style={styles.deleteButtonLabel}>✕</Text>
                </Pressable>
              </Surface>
            ),
          )}
        </View>

        {games !== null && games.length > 0 && (
          <>
            {confirmClearAll ? (
              <Surface style={styles.gameCard}>
                <Text style={styles.confirmText}>{t("history:confirmClearAll")}</Text>
                <View style={styles.confirmRow}>
                  <Button
                    label={t("history:deleteConfirm")}
                    onPress={handleClearAll}
                    variant="secondary"
                    style={styles.confirmButton}
                  />
                  <Button
                    label={t("history:deleteCancel")}
                    onPress={() => setConfirmClearAll(false)}
                    variant="ghost"
                    style={styles.confirmButton}
                  />
                </View>
              </Surface>
            ) : (
              <Button label={t("history:clearAll")} onPress={() => setConfirmClearAll(true)} variant="ghost" />
            )}
          </>
        )}
      </ScrollView>
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
  scrollContainer: {
    width: "100%",
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
  title: {
    ...typography.title,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  date: {
    color: colors.secondaryText,
    fontFamily: fonts.body,
    fontSize: 13,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
  },
  empty: {
    ...typography.body,
    textAlign: "center",
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  list: {
    width: "100%",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  gameCard: {
    borderWidth: 1,
    borderColor: colors.goldMuted,
  },
  gameCardRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  gameCardMain: {
    flex: 1,
  },
  deleteButton: {
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  deleteButtonLabel: {
    color: colors.validationWarn,
    fontFamily: fonts.bodyBold,
    fontSize: 16,
  },
  gameCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  gameCardMode: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: colors.cream,
  },
  gameCardDate: {
    color: colors.secondaryText,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  gameCardWinner: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.gold,
  },
  winnerText: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.gold,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  confirmText: {
    color: colors.cream,
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  confirmRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
  },
  confirmButton: {
    minWidth: 0,
    paddingHorizontal: spacing.md,
  },
});
