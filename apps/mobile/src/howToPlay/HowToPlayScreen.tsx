import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackButton, colors, fonts, layout, spacing, typography, useTranslation } from "ui-kit";

export interface HowToPlayScreenProps {
  onExit: () => void;
}

/** A plain-language rules explainer for players who don't already know King, reached from
 * Settings — not a replacement for the alternative-rules toggles themselves, just context for
 * why they exist. */
export function HowToPlayScreen({ onExit }: HowToPlayScreenProps) {
  const { t } = useTranslation();
  const avoidList = t("howToPlay:avoidList", { returnObjects: true }) as string[];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[styles.content, { maxWidth: layout.maxContentWidth }]}
      >
        <View style={styles.header}>
          <BackButton onPress={onExit} label={t("howToPlay:backToSettings")} />
        </View>
        <Text style={styles.title}>{t("howToPlay:title")}</Text>
        <Text style={styles.paragraph}>{t("howToPlay:intro")}</Text>
        <Text style={styles.paragraph}>{t("howToPlay:basics")}</Text>

        <Text style={styles.heading}>{t("howToPlay:avoidHeading")}</Text>
        <View style={styles.list}>
          {avoidList.map((item, index) => (
            <Text key={index} style={styles.listItem}>
              {"• "}
              {item}
            </Text>
          ))}
        </View>
        <Text style={styles.paragraph}>{t("howToPlay:heartsNote")}</Text>

        <Text style={styles.heading}>{t("howToPlay:tricksHeading")}</Text>
        <Text style={styles.paragraph}>{t("howToPlay:tricksBody")}</Text>

        <Text style={styles.paragraph}>{t("howToPlay:winning")}</Text>
        <Text style={styles.paragraph}>{t("howToPlay:outro")}</Text>
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
    alignItems: "stretch",
    paddingBottom: spacing.xl,
  },
  header: {
    width: "100%",
    marginBottom: spacing.sm,
    alignItems: "flex-start",
  },
  title: {
    ...typography.title,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  heading: {
    fontFamily: fonts.bodySemi,
    fontSize: 16,
    color: colors.gold,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  paragraph: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.cream,
    marginBottom: spacing.md,
  },
  list: {
    marginBottom: spacing.sm,
  },
  listItem: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.cream,
    marginBottom: spacing.xs,
  },
});
