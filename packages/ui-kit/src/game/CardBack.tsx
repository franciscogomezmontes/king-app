import { StyleSheet, View } from "react-native";
import { CARD_HEIGHT, CARD_WIDTH } from "./PlayingCard";

/** A face-down card — opponents' hidden hands. */
export function CardBack() {
  return <View style={styles.card} />;
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 6,
    backgroundColor: "#0f4d38",
    borderWidth: 1,
    borderColor: "#f5e6c8",
  },
});
