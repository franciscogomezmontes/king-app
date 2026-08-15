import { Pressable, SafeAreaView, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import type { GameRules } from "rules-engine";
import {
  Button,
  CARD_BACK_STYLES,
  CardBack,
  GAME_RULE_TOGGLE_KEYS,
  Surface,
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
}

/** The player's cross-mode preferences: which face-down pattern opponents' cards show in Solo vs
 * Computer, and the game-setup rules menu (Mandatory Killing, Auction Must Sell, Playing Down,
 * Backwards, the no-face-cards redeal, and whatever gets added to `GameRules` next — the toggle
 * list is driven by `GAME_RULE_TOGGLE_KEYS`, so a new rules-engine toggle shows up here with no UI
 * change needed, just a translated label). Configured once here rather than re-asked per game. */
export function SettingsScreen({ onExit }: SettingsScreenProps) {
  const { t } = useTranslation();
  const { settings, setCardBackStyle, setGameRule, setSaveHistoryEnabled } = useSettings();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[styles.content, { maxWidth: layout.maxContentWidth }]}
      >
        <Text style={styles.title}>{t("settings:title")}</Text>

        <Text style={styles.sectionTitle}>{t("settings:cardBack.title")}</Text>
        <Text style={styles.sectionHint}>{t("settings:cardBack.hint")}</Text>

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

        <View style={styles.ruleList}>
          {GAME_RULE_TOGGLE_KEYS.map((key: keyof GameRules) => (
            <Surface key={key} style={styles.ruleRow}>
              <View style={styles.ruleTextColumn}>
                <Text style={styles.ruleName}>{t(`rules:ruleToggles.${key}.name`)}</Text>
                <Text style={styles.ruleDescription}>{t(`rules:ruleToggles.${key}.description`)}</Text>
              </View>
              <Switch
                value={settings.gameRules[key]}
                onValueChange={(value) => setGameRule(key, value)}
                trackColor={{ false: colors.surface, true: colors.gold }}
                thumbColor={colors.cream}
              />
            </Surface>
          ))}
        </View>

        <Text style={styles.sectionTitle}>{t("settings:history.title")}</Text>
        <Text style={styles.sectionHint}>{t("settings:history.hint")}</Text>
        <Surface style={[styles.ruleRow, styles.historyRow]}>
          <View style={styles.ruleTextColumn}>
            <Text style={styles.ruleName}>{t("settings:history.toggleName")}</Text>
            <Text style={styles.ruleDescription}>{t("settings:history.toggleDescription")}</Text>
          </View>
          <Switch
            value={settings.saveHistoryEnabled}
            onValueChange={setSaveHistoryEnabled}
            trackColor={{ false: colors.surface, true: colors.gold }}
            thumbColor={colors.cream}
          />
        </Surface>

        <Button label={t("settings:backToMenu")} onPress={onExit} variant="ghost" />
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
  title: {
    ...typography.displayMd,
    marginBottom: spacing.lg,
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
  historyRow: {
    width: "100%",
    marginBottom: spacing.xl,
  },
  ruleTextColumn: {
    flex: 1,
  },
  ruleName: {
    color: colors.cream,
    fontFamily: fonts.bodySemi,
    fontSize: 15,
  },
  ruleDescription: {
    color: colors.secondaryText,
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 2,
  },
});
