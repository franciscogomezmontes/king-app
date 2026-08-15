import {
  CormorantGaramond_600SemiBold,
  CormorantGaramond_700Bold,
} from "@expo-google-fonts/cormorant-garamond";
import {
  SourceSans3_400Regular,
  SourceSans3_600SemiBold,
  SourceSans3_700Bold,
} from "@expo-google-fonts/source-sans-3";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import {
  I18nextProvider,
  KingMark,
  SUPPORTED_LOCALES,
  Surface,
  colors,
  fonts,
  layout,
  radii,
  spacing,
  typography,
  useTranslation,
} from "ui-kit";
import { GameScreen } from "./src/game/GameScreen";
import { HistoryScreen } from "./src/history/HistoryScreen";
import { initI18n } from "./src/i18n";
import { OnlineScreen } from "./src/online/OnlineScreen";
import { ScorekeeperScreen } from "./src/scorekeeper/ScorekeeperScreen";
import { SettingsScreen } from "./src/settings/SettingsScreen";

type Screen = "menu" | "solo" | "scorekeeper" | "history" | "settings" | "online";

export default function App() {
  const [i18n] = useState(() => initI18n());
  const [screen, setScreen] = useState<Screen>("menu");
  const [fontsLoaded] = useFonts({
    CormorantGaramond_600SemiBold,
    CormorantGaramond_700Bold,
    SourceSans3_400Regular,
    SourceSans3_600SemiBold,
    SourceSans3_700Bold,
  });

  if (!fontsLoaded) {
    return <View style={styles.boot} />;
  }

  return (
    <I18nextProvider i18n={i18n}>
      <StatusBar style="light" />
      {screen === "solo" && <GameScreen onExit={() => setScreen("menu")} />}
      {screen === "online" && <OnlineScreen onExit={() => setScreen("menu")} />}
      {screen === "scorekeeper" && <ScorekeeperScreen onExit={() => setScreen("menu")} />}
      {screen === "history" && <HistoryScreen onExit={() => setScreen("menu")} />}
      {screen === "settings" && <SettingsScreen onExit={() => setScreen("menu")} />}
      {screen === "menu" && <Home onSelect={setScreen} />}
    </I18nextProvider>
  );
}

function Home({ onSelect }: { onSelect: (screen: Screen) => void }) {
  const { t, i18n } = useTranslation();
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const activeLocale = (i18n.resolvedLanguage ?? i18n.language).slice(0, 2);

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.content, { maxWidth: layout.maxContentWidth }]}>
        <View style={styles.hero}>
          <KingMark size="lg" />
          <Text style={[styles.title, isCompact && styles.titleCompact]}>{t("app:title")}</Text>
          <Text style={styles.tagline}>{t("app:tagline")}</Text>
          <Text style={styles.pitch}>{t("app:pitch")}</Text>
        </View>

        <View style={styles.modeList}>
          <Pressable onPress={() => onSelect("scorekeeper")}>
            <Surface style={styles.modeCard}>
              <Text style={styles.modeLabel}>{t("app:modes.scorekeeper")}</Text>
              <Text style={styles.modeHint}>{t("app:modes.scorekeeperHint")}</Text>
            </Surface>
          </Pressable>
          <Pressable onPress={() => onSelect("solo")}>
            <Surface style={styles.modeCard}>
              <Text style={styles.modeLabel}>{t("app:modes.solo")}</Text>
              <Text style={styles.modeHint}>{t("app:modes.soloHint")}</Text>
            </Surface>
          </Pressable>
          <Pressable onPress={() => onSelect("online")}>
            <Surface style={styles.modeCard}>
              <Text style={styles.modeLabel}>{t("app:modes.online")}</Text>
              <Text style={styles.modeHint}>{t("app:modes.onlineHint")}</Text>
            </Surface>
          </Pressable>
          <Pressable onPress={() => onSelect("history")}>
            <Surface style={styles.modeCard}>
              <Text style={styles.modeLabel}>{t("history:title")}</Text>
              <Text style={styles.modeHint}>{t("app:modes.historyHint")}</Text>
            </Surface>
          </Pressable>
          <Pressable onPress={() => onSelect("settings")}>
            <Surface style={styles.modeCard}>
              <Text style={styles.modeLabel}>{t("settings:title")}</Text>
              <Text style={styles.modeHint}>{t("app:modes.settingsHint")}</Text>
            </Surface>
          </Pressable>
        </View>

        <View style={styles.languageRow}>
          <Text style={styles.languageLabel}>{t("app:language")}</Text>
          {SUPPORTED_LOCALES.map((locale) => (
            <Pressable
              key={locale}
              onPress={() => i18n.changeLanguage(locale)}
              style={[styles.languageButton, activeLocale === locale && styles.languageButtonActive]}
            >
              <Text style={styles.languageButtonLabel}>{locale.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: colors.felt,
  },
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
    flex: 1,
  },
  hero: {
    alignItems: "center",
    marginBottom: spacing.xxl,
  },
  title: {
    ...typography.displayLg,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  titleCompact: {
    fontSize: 40,
    lineHeight: 44,
  },
  tagline: {
    fontFamily: fonts.displaySemi,
    fontSize: 16,
    color: colors.gold,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  pitch: {
    ...typography.body,
    textAlign: "center",
    marginTop: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  modeList: {
    width: "100%",
    gap: spacing.md,
  },
  modeCard: {
    borderWidth: 1,
    borderColor: colors.goldMuted,
  },
  modeLabel: {
    fontFamily: fonts.displaySemi,
    fontSize: 22,
    color: colors.cream,
  },
  modeHint: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  languageRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: "auto",
    paddingBottom: spacing.xl,
    paddingTop: spacing.xxl,
  },
  languageLabel: {
    ...typography.caption,
    marginRight: spacing.xs,
  },
  languageButton: {
    borderRadius: radii.sm,
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    minHeight: 36,
    justifyContent: "center",
  },
  languageButtonActive: {
    backgroundColor: colors.accent,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  languageButtonLabel: {
    color: colors.cream,
    fontFamily: fonts.bodySemi,
    fontSize: 13,
  },
});
