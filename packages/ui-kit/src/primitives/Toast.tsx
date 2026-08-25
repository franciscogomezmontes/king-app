import { StyleSheet, Text } from "react-native";
import { colors, fonts, radii, spacing } from "../theme";
import { Panel } from "./Surface";

export interface ToastProps {
  message: string;
}

/**
 * A brief, ephemeral message in normal document flow (not React Native's `Modal` — see
 * `king-cross-platform-ui`: it behaves inconsistently across Web/Android/iOS). The caller owns
 * when it's shown and for how long (e.g. a `setTimeout` clearing its own local state) — this
 * component only renders the message while it's given one. Built for Expert difficulty's
 * illegal-play explanation (see `Hand.tsx`'s `explainIllegal`), but generic enough for any other
 * "briefly tell the player something" need.
 */
export function Toast({ message }: ToastProps) {
  return (
    <Panel style={styles.panel}>
      <Text style={styles.text}>{message}</Text>
    </Panel>
  );
}

const styles = StyleSheet.create({
  panel: {
    width: "100%",
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  text: {
    color: colors.cream,
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    textAlign: "center",
  },
});
