import { StatusBar } from "expo-status-bar";
import { useMemo } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { createDeck } from "rules-engine";

/**
 * Mode picker shell — proves the Web/Android/iOS/rules-engine wiring works end to end.
 * Each mode below is a real Notion project-plan phase; wire up a real screen per phase
 * instead of the placeholder alert-free Pressable here. See .claude/skills/king-cross-platform-ui
 * before building these out.
 */
const MODES = [
  { id: "scorekeeper", label: "Scorekeeper", phase: "Phase 3" },
  { id: "solo", label: "Solo vs. Computer", phase: "Phase 4" },
  { id: "local", label: "Local Pass-and-Play", phase: "Phase 5" },
  { id: "online", label: "Online Multiplayer", phase: "Phase 6 (later)" },
] as const;

// Beyond this viewport width, stop growing the content and center it instead — otherwise
// this reads fine on a phone but stretches unreadably edge-to-edge on a desktop browser.
const MAX_CONTENT_WIDTH = 480;

export default function App() {
  // Sanity check that the rules-engine workspace package resolves correctly on this platform.
  const deckSize = useMemo(() => createDeck().length, []);
  const { width } = useWindowDimensions();
  const isCompact = width < 380; // smallest phones: tighten padding/type a notch further

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={[styles.content, { maxWidth: MAX_CONTENT_WIDTH }]}>
        <Text style={[styles.title, isCompact && styles.titleCompact]}>King</Text>
        <Text style={styles.subtitle}>rules-engine wired up — deck has {deckSize} cards</Text>
        <View style={styles.modeList}>
          {MODES.map((mode) => (
            <Pressable key={mode.id} style={styles.modeButton}>
              <Text style={styles.modeLabel}>{mode.label}</Text>
              <Text style={styles.modePhase}>{mode.phase}</Text>
            </Pressable>
          ))}
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
