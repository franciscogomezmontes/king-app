import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import {
  Button,
  CARD_BACK_STYLES,
  CardBack,
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

/** The player's cross-mode preferences — currently just which face-down pattern opponents' cards
 * show in Solo vs Computer, picked from a live preview of each option rather than a bare label
 * list. More toggles (e.g. the alternative-rules menu from CLAUDE.md) belong here once built. */
export function SettingsScreen({ onExit }: SettingsScreenProps) {
  const { t } = useTranslation();
  const { settings, setCardBackStyle } = useSettings();

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.content, { maxWidth: layout.maxContentWidth }]}>
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

        <Button label={t("settings:backToMenu")} onPress={onExit} variant="ghost" />
      </View>
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
  content: {
    width: "100%",
    alignSelf: "center",
    alignItems: "center",
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
});
