import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "../i18n";

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
    backgroundColor: "#f2c14e",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginTop: 2,
    alignSelf: "center",
  },
  text: {
    color: "#0b3d2e",
    fontSize: 10,
    fontWeight: "700",
  },
});
