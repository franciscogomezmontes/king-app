import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Avatar, Button, Surface, colors, fonts, layout, radii, spacing, typography, useTranslation } from "ui-kit";
import { BOT_ROSTER } from "../game/botRoster";
import { useProfile } from "./useProfile";

export interface ProfileScreenProps {
  onExit: () => void;
}

/** The player's own identity: display name and a chosen portrait, drawn from the same 10-image
 * gallery `BOT_ROSTER` (game/botRoster.ts) already supplies bot opponents from — one shared art set
 * instead of a second one just for the human seat. Persisted via `useProfile`; both fields save
 * immediately on change, same as Settings' toggles — no separate Save button/step. */
export function ProfileScreen({ onExit }: ProfileScreenProps) {
  const { t } = useTranslation();
  const { profile, setName, setAvatarIndex } = useProfile();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[styles.content, { maxWidth: layout.maxContentWidth }]}
      >
        <Text style={styles.title}>{t("profile:title")}</Text>

        <Text style={styles.sectionTitle}>{t("profile:name.label")}</Text>
        <TextInput
          style={styles.nameInput}
          value={profile.name}
          onChangeText={setName}
          placeholder={t("profile:name.placeholder")}
          placeholderTextColor={colors.muted}
          maxLength={24}
          returnKeyType="done"
        />
        <Text style={styles.sectionHint}>{t("profile:name.hint")}</Text>

        <Text style={styles.sectionTitle}>{t("profile:avatar.title")}</Text>
        <Text style={styles.sectionHint}>{t("profile:avatar.hint")}</Text>
        <View style={styles.avatarGrid}>
          {BOT_ROSTER.map((entry, index) => {
            const selected = profile.avatarIndex === index;
            return (
              <Pressable key={entry.name} onPress={() => setAvatarIndex(index)}>
                <Surface style={[styles.avatarCard, selected && styles.avatarCardSelected]}>
                  <Avatar name={entry.name} imageSource={entry.image} size="md" showName={false} />
                </Surface>
              </Pressable>
            );
          })}
        </View>

        <Button label={t("profile:backToMenu")} onPress={onExit} variant="ghost" style={styles.backButton} />
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
  nameInput: {
    width: "100%",
    backgroundColor: colors.cream,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: 16,
    marginTop: spacing.xs,
  },
  avatarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  avatarCard: {
    alignItems: "center",
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.goldMuted,
    borderRadius: radii.lg,
  },
  avatarCardSelected: {
    borderColor: colors.gold,
    borderWidth: 2,
  },
  backButton: {
    marginTop: spacing.sm,
  },
});
