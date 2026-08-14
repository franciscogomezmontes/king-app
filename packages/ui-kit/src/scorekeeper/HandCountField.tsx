import { forwardRef } from "react";
import { StyleSheet, Text, TextInput, View, type TextInput as RNTextInput } from "react-native";
import { colors, fonts, radii } from "../theme";

export interface HandCountFieldProps {
  /** Current count, as text so the field can hold "" while the player is mid-edit rather than
   * snapping to "0" on every keystroke. */
  value: string;
  onChangeText: (text: string) => void;
  /** Clamps and commits the value once the player moves on (blur or keyboard submit). */
  onCommit: () => void;
  label: string;
  returnKeyType: "next" | "done";
  onSubmitEditing: () => void;
}

/**
 * One player's numeric entry for the hand currently being recorded — the system keyboard only
 * (no on-screen stepper), per the family's own preference: it's what they're already used to from
 * typing numbers anywhere else, and keeps the always-visible Scoreboard above from ever being
 * covered by a custom keypad. `returnKeyType`/`onSubmitEditing` let four of these chain focus
 * player-to-player so entering a whole hand is a single fast sequence of taps on the keyboard.
 */
export const HandCountField = forwardRef<RNTextInput, HandCountFieldProps>(function HandCountField(
  { value, onChangeText, onCommit, label, returnKeyType, onSubmitEditing },
  ref,
) {
  return (
    <View style={styles.container}>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <TextInput
        ref={ref}
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        onBlur={onCommit}
        keyboardType="number-pad"
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        selectTextOnFocus
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flex: 1,
  },
  label: {
    color: colors.secondaryText,
    fontFamily: fonts.body,
    fontSize: 12,
    marginBottom: 4,
  },
  input: {
    width: "100%",
    minWidth: 44,
    textAlign: "center",
    color: colors.ink,
    backgroundColor: colors.cream,
    fontFamily: fonts.bodyBold,
    fontSize: 20,
    borderRadius: radii.md,
    paddingVertical: 8,
  },
});
