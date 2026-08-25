import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { GameRules } from "rules-engine";
import {
  BackButton,
  Button,
  CARD_BACK_STYLES,
  CardBack,
  GAME_RULE_TOGGLE_KEYS,
  InfoTooltip,
  Surface,
  Switch,
  colors,
  fonts,
  layout,
  radii,
  spacing,
  typography,
  useTranslation,
} from "ui-kit";
import { useSettings } from "./useSettings";

export interface SettingsScreenProps {
  onExit: () => void;
  onHowToPlay: () => void;
}

/** The player's cross-mode preferences: which face-down pattern opponents' cards show in Solo vs
 * Computer, and the game-setup rules menu (Mandatory Killing, Auction Must Sell, Playing Down,
 * Backwards, the no-face-cards redeal, and whatever gets added to `GameRules` next — the toggle
 * list is driven by `GAME_RULE_TOGGLE_KEYS`, so a new rules-engine toggle shows up here with no UI
 * change needed, just a translated label). Configured once here rather than re-asked per game.
 * Also the entry point to the "How to Play" rules explainer, for players who don't know the game
 * yet. */
export function SettingsScreen({ onExit, onHowToPlay }: SettingsScreenProps) {
  const { t } = useTranslation();
  const { settings, setCardBackStyle, setGameRule, setSaveHistoryEnabled, setShowScoreSummary } = useSettings();
  // Which row's "(i)" tooltip is currently open, if any — only one at a time, and only that row's
  // own Surface gets elevated above its sibling rows below it (see InfoTooltip's own `open` doc
  // comment for why the elevation has to happen on the row, not just the tooltip itself).
  const [openInfoKey, setOpenInfoKey] = useState<string | null>(null);
  function toggleInfo(key: string) {
    setOpenInfoKey((current) => (current === key ? null : key));
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[styles.content, { maxWidth: layout.maxContentWidth }]}
      >
        <View style={styles.header}>
          <BackButton onPress={onExit} label={t("settings:backToMenu")} />
        </View>
        <Text style={styles.title}>{t("settings:title")}</Text>

        <Button
          label={t("settings:howToPlay.button")}
          onPress={onHowToPlay}
          variant="secondary"
          style={styles.howToPlayButton}
        />

        <Text style={styles.sectionTitle}>{t("settings:cardBack.title")}</Text>

        <View style={styles.optionRow}>
          {CARD_BACK_STYLES.map((variant) => {
            const selected = settings.cardBackStyle === variant;
            return (
              <Pressable key={variant} onPress={() => setCardBackStyle(variant)}>
                <Surface style={[styles.optionCard, selected && styles.optionCardSelected]}>
                  <CardBack variant={variant} />
                  <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                    {t(`settings:cardBack.${variant}`)}
                  </Text>
                </Surface>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>{t("settings:gameRules.title")}</Text>
        <Text style={styles.sectionHint}>{t("settings:gameRules.hint")}</Text>

        <View
          style={[
            styles.ruleList,
            // The row-level elevation above only wins *within* ruleList's own 5 rows — ruleList
            // itself also needs elevating above its own siblings below it (History, Score
            // Summary), the exact same cross-ancestor stacking rule one level up.
            openInfoKey !== null && (GAME_RULE_TOGGLE_KEYS as string[]).includes(openInfoKey) && styles.ruleListElevated,
          ]}
        >
          {GAME_RULE_TOGGLE_KEYS.map((key: keyof GameRules) => (
            <Surface key={key} style={[styles.ruleRow, openInfoKey === key && styles.ruleRowElevated]}>
              <View style={styles.ruleTextColumn}>
                <Text style={styles.ruleName}>{t(`rules:ruleToggles.${key}.name`)}</Text>
                <InfoTooltip
                  content={t(`rules:ruleToggles.${key}.description`)}
                  label={t("rules:infoLabel", { name: t(`rules:ruleToggles.${key}.name`) })}
                  open={openInfoKey === key}
                  onToggle={() => toggleInfo(key)}
                />
              </View>
              <Switch
                value={settings.gameRules[key]}
                onValueChange={(value) => setGameRule(key, value)}
              />
            </Surface>
          ))}
        </View>

        <Text style={styles.sectionTitle}>{t("settings:history.title")}</Text>
        <Surface style={[styles.ruleRow, styles.historyRow, openInfoKey === "history" && styles.ruleRowElevated]}>
          <View style={styles.ruleTextColumn}>
            <Text style={styles.ruleName}>{t("settings:history.toggleName")}</Text>
            <InfoTooltip
              content={t("settings:history.toggleDescription")}
              label={t("rules:infoLabel", { name: t("settings:history.toggleName") })}
              open={openInfoKey === "history"}
              onToggle={() => toggleInfo("history")}
            />
          </View>
          <Switch
            value={settings.saveHistoryEnabled}
            onValueChange={setSaveHistoryEnabled}
          />
        </Surface>

        <Surface style={[styles.ruleRow, styles.historyRow, openInfoKey === "scoreSummary" && styles.ruleRowElevated]}>
          <View style={styles.ruleTextColumn}>
            <Text style={styles.ruleName}>{t("settings:scoreSummary.toggleName")}</Text>
            <InfoTooltip
              content={t("settings:scoreSummary.toggleDescription")}
              label={t("rules:infoLabel", { name: t("settings:scoreSummary.toggleName") })}
              open={openInfoKey === "scoreSummary"}
              onToggle={() => toggleInfo("scoreSummary")}
            />
          </View>
          <Switch
            value={settings.showScoreSummary}
            onValueChange={setShowScoreSummary}
          />
        </Surface>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.felt,
    alignItems: "center",
    paddingTop: 64,
    paddingHorizontal: spacing.lg,
  },
  scrollContainer: {
    width: "100%",
  },
  content: {
    width: "100%",
    alignSelf: "center",
    alignItems: "center",
    paddingBottom: spacing.xl,
  },
  header: {
    width: "100%",
    marginBottom: spacing.sm,
    alignItems: "flex-start",
  },
  title: {
    ...typography.displayMd,
    marginBottom: spacing.lg,
  },
  howToPlayButton: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontFamily: fonts.displaySemi,
    fontSize: 18,
    color: colors.cream,
    alignSelf: "flex-start",
  },
  sectionHint: {
    ...typography.caption,
    alignSelf: "flex-start",
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  optionCard: {
    alignItems: "center",
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.goldMuted,
    borderRadius: radii.lg,
  },
  optionCardSelected: {
    borderColor: colors.gold,
    borderWidth: 2,
  },
  optionLabel: {
    color: colors.secondaryText,
    fontFamily: fonts.body,
    fontSize: 13,
    marginTop: spacing.sm,
  },
  optionLabelSelected: {
    color: colors.gold,
    fontFamily: fonts.bodySemi,
  },
  ruleList: {
    width: "100%",
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  ruleListElevated: {
    zIndex: 100,
    elevation: 16,
  },
  ruleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.goldMuted,
    borderRadius: radii.lg,
  },
  ruleRowElevated: {
    zIndex: 100,
    elevation: 16,
  },
  historyRow: {
    width: "100%",
    marginBottom: spacing.xl,
  },
  ruleTextColumn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  ruleName: {
    color: colors.cream,
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    flexShrink: 1,
  },
});
