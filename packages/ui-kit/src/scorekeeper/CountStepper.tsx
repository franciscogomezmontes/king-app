import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, fonts, radii } from "../theme";

export interface CountStepperProps {
  /** Current count (0 to `max`). */
  value: number;
  /** The most this count could ever be for this hand type (e.g. 13 tricks, 1 for King of Hearts). */
  max: number;
  onChange: (value: number) => void;
  label?: string;
}

function clamp(n: number, max: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(max, Math.round(n)));
}

/**
 * A count entry widget sized for values from 0-13 (tricks/hearts/etc. one player captured in a
 * hand) — the king-cross-platform-ui skill calls for "fast, error-resistant entry (steppers/large
 * tap targets)" for Scorekeeper mode specifically. Plain +/- steppers alone are fast for the small
 * ranges (0-1, 0-2) but nobody is going to tap "+1" thirteen times for a wide range (0-13, 0-8,
 * 0-4) — tapping the number itself swaps in a numeric keyboard for those, same
 * `keyboardType="number-pad"` pattern already used for the auction bid input in Solo vs Computer.
 */
export function CountStepper({ value, max, onChange, label }: CountStepperProps) {
  const [editing, setEditing] = useState(false);
  const [draftText, setDraftText] = useState("");

  function commitDraft() {
    onChange(clamp(parseInt(draftText, 10), max));
    setEditing(false);
  }

  return (
    <View style={styles.container}>
      {label !== undefined && (
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      )}
      <View style={styles.row}>
        <Pressable
          style={[styles.button, value <= 0 && styles.buttonDisabled]}
          disabled={value <= 0}
          onPress={() => onChange(clamp(value - 1, max))}
        >
          <Text style={styles.buttonLabel}>−</Text>
        </Pressable>
        {editing ? (
          <TextInput
            style={styles.input}
            value={draftText}
            onChangeText={setDraftText}
            onBlur={commitDraft}
            onSubmitEditing={commitDraft}
            keyboardType="number-pad"
            autoFocus
            selectTextOnFocus
          />
        ) : (
          <Pressable
            style={styles.valueButton}
            onPress={() => {
              setDraftText(String(value));
              setEditing(true);
            }}
          >
            <Text style={styles.value}>{value}</Text>
          </Pressable>
        )}
        <Pressable
          style={[styles.button, value >= max && styles.buttonDisabled]}
          disabled={value >= max}
          onPress={() => onChange(clamp(value + 1, max))}
        >
          <Text style={styles.buttonLabel}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  label: {
    color: colors.secondaryText,
    fontFamily: fonts.body,
    fontSize: 12,
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  button: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    backgroundColor: colors.surface,
    opacity: 0.5,
  },
  buttonLabel: {
    color: colors.cream,
    fontFamily: fonts.bodyBold,
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 22,
  },
  valueButton: {
    minWidth: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    color: colors.cream,
    fontFamily: fonts.bodyBold,
    fontSize: 20,
    fontWeight: "700",
  },
  input: {
    minWidth: 40,
    textAlign: "center",
    color: colors.cream,
    fontFamily: fonts.bodyBold,
    fontSize: 20,
    fontWeight: "700",
    borderBottomWidth: 2,
    borderBottomColor: colors.gold,
    padding: 0,
  },
});
