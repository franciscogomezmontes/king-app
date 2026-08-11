import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { createDeck } from "rules-engine";
import { I18nextProvider, SUPPORTED_LOCALES, useTranslation } from "ui-kit";
import { GameScreen } from "./src/game/GameScreen";
import { initI18n } from "./src/i18n";

/**
 * Mode picker shell — proves the Web/Android/iOS/rules-engine/i18n wiring works end to end.
 * Each mode below is a real Notion project-plan phase; wire up a real screen per phase
 * instead of the placeholder alert-free Pressable here. See .claude/skills/king-cross-platform-ui
 * before building these out.
 */
const MODES = [
  { id: "scorekeeper", phase: 3, later: false },
  { id: "solo", phase: 4, later: false },
  { id: "local", phase: 5, later: false },
  { id: "online", phase: 6, later: true },
] as const;

// Beyond this viewport width, stop growing the content and center it instead — otherwise
// this reads fine on a phone but stretches unreadably edge-to-edge on a desktop browser.
const MAX_CONTENT_WIDTH = 480;

type Screen = "menu" | "solo";

export default function App() {
  // One i18next instance per app session — see src/i18n/index.ts for device-locale detection.
  const [i18n] = useState(() => initI18n());
  const [screen, setScreen] = useState<Screen>("menu");

  return (
    <I18nextProvider i18n={i18n}>
      <StatusBar style="light" />
      {screen === "solo" ? (
        <GameScreen onExit={() => setScreen("menu")} />
      ) : (
        <ModePicker onSelectSolo={() => setScreen("solo")} />
      )}
    </I18nextProvider>
  );
}

function ModePicker({ onSelectSolo }: { onSelectSolo: () => void }) {
  const { t, i18n } = useTranslation();
  // Sanity check that the rules-engine workspace package resolves correctly on this platform.
  const deckSize = useMemo(() => createDeck().length, []);
  const { width } = useWindowDimensions();
  const isCompact = width < 380; // smallest phones: tighten padding/type a notch further

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.content, { maxWidth: MAX_CONTENT_WIDTH }]}>
        <View style={styles.languageSwitcher}>
          {SUPPORTED_LOCALES.map((locale) => (
            <Pressable
              key={locale}
              onPress={() => i18n.changeLanguage(locale)}
              style={[styles.languageButton, i18n.language === locale && styles.languageButtonActive]}
            >
              <Text style={styles.languageButtonLabel}>{locale.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={[styles.title, isCompact && styles.titleCompact]}>{t("app:title")}</Text>
        <Text style={styles.subtitle}>{t("app:subtitle", { count: deckSize })}</Text>
        <View style={styles.modeList}>
          {MODES.map((mode) => {
            const isSolo = mode.id === "solo";
            return (
              <Pressable
                key={mode.id}
                style={[styles.modeButton, !isSolo && styles.modeButtonInert]}
                onPress={isSolo ? onSelectSolo : undefined}
                disabled={!isSolo}
              >
                <Text style={styles.modeLabel}>{t(`app:modes.${mode.id}`)}</Text>
                <Text style={styles.modePhase}>
                  {mode.later ? t("app:phaseLater", { number: mode.phase }) : t("app:phase", { number: mode.phase })}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b3d2e",
    alignItems: "center",
    paddingTop: 64,
    paddingHorizontal: 16,
  },
  // Caps + centers everything on wide viewports; on a phone (narrower than the cap) this is
  // just 100% width, so nothing changes there.
  content: {
    width: "100%",
    alignSelf: "center",
  },
  languageSwitcher: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
  },
  languageButton: {
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: "#0f4d38",
  },
  languageButtonActive: {
    backgroundColor: "#1c7a53",
  },
  languageButtonLabel: {
    color: "#f5e6c8",
    fontSize: 13,
    fontWeight: "600",
  },
  title: {
    fontSize: 40,
    fontWeight: "700",
    color: "#f5e6c8",
    textAlign: "center",
  },
  titleCompact: {
    fontSize: 32,
  },
  subtitle: {
    color: "#c9d8cf",
    marginTop: 8,
    marginBottom: 32,
    textAlign: "center",
  },
  modeList: {
    width: "100%",
    gap: 12,
  },
  modeButton: {
    backgroundColor: "#0f4d38",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modeButtonInert: {
    opacity: 0.5,
  },
  modeLabel: {
    color: "#f5e6c8",
    fontSize: 18,
    fontWeight: "600",
  },
  modePhase: {
    color: "#8fae9c",
    fontSize: 13,
  },
});
