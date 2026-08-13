import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "../i18n";
import { colors, fonts, radii } from "../theme";

/** A small "Dealer" marker — there should always be a visible indicator of who's dealing the
 * current hand, independent of whose turn it is to act right now. */
export function DealerBadge() {
  const { t } = useTranslation();
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{t("game:dealer")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: colors.gold,
    borderRadius: radii.sm,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginTop: 2,
    alignSelf: "center",
  },
  text: {
    color: colors.felt,
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    fontWeight: "700",
  },
});
