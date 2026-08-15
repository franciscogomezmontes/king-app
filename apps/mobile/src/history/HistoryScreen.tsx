import { useEffect, useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import type { PlayerIndex } from "rules-engine";
import { Button, Scoreboard, Surface, colors, fonts, layout, spacing, typography, useTranslation } from "ui-kit";
import { loadCompletedGames } from "./persistence";
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
 * (physical cards) and Solo vs Computer both write to the same store (see
 * `apps/mobile/src/history/persistence.ts`), so a game night's paper scores and a solo practice
 * session against the bots show up in the same place. */
export function HistoryScreen({ onExit }: HistoryScreenProps) {
  const { t } = useTranslation();
  const [games, setGames] = useState<CompletedGame[] | null>(null);
  const [selected, setSelected] = useState<CompletedGame | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadCompletedGames().then((loaded) => {
      if (!cancelled) setGames(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (selected !== null) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={[styles.content, { maxWidth: layout.maxContentWidth }]}
        >
          <Text style={styles.title}>{t(`history:modeLabel.${selected.mode}`)}</Text>
          <Text style={styles.date}>{selected.date}</Text>
          <Text style={styles.winnerText}>{winnerLine(t, selected)}</Text>
          <Scoreboard handHistory={selected.handHistory} seatLabels={selected.playerNames} />
          <Button label={t("history:back")} onPress={() => setSelected(null)} variant="secondary" />
          <Button label={t("history:backToMenu")} onPress={onExit} variant="ghost" />
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
        <Text style={styles.title}>{t("history:title")}</Text>

        {games !== null && games.length === 0 && <Text style={styles.empty}>{t("history:empty")}</Text>}

        <View style={styles.list}>
          {(games ?? []).map((game) => (
            <Pressable key={game.id} onPress={() => setSelected(game)}>
              <Surface style={styles.gameCard}>
                <View style={styles.gameCardHeader}>
                  <Text style={styles.gameCardMode}>{t(`history:modeLabel.${game.mode}`)}</Text>
                  <Text style={styles.gameCardDate}>{game.date}</Text>
                </View>
                <Text style={styles.gameCardWinner}>{winnerLine(t, game)}</Text>
              </Surface>
            </Pressable>
          ))}
        </View>

        <Button label={t("history:backToMenu")} onPress={onExit} variant="ghost" />
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
});
