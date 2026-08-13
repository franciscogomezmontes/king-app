import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, fonts, radii, spacing } from "../theme";

export interface CountStepperProps {
  value: number;
  max: number;
  onChange: (value: number) => void;
  label?: string;
}

function clamp(n: number, max: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(max, Math.round(n)));
}

/**
 * One player's pad on the scorekeeper table: big count, big +/−, tap the number for a keypad.
 * Sized as a flex cell in a 2×2 grid, not a tiny chip in a wrapping row.
 */
export function CountStepper({ value, max, onChange, label }: CountStepperProps) {
  const [editing, setEditing] = useState(false);
  const [draftText, setDraftText] = useState("");

  function commitDraft() {
    onChange(clamp(parseInt(draftText, 10), max));
    setEditing(false);
  }

  return (
    <View style={styles.pad}>
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
          hitSlop={4}
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
          hitSlop={4}
        >
          <Text style={styles.buttonLabel}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.goldMuted,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    minHeight: 132,
    justifyContent: "center",
  },
  label: {
    color: colors.cream,
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    backgroundColor: colors.felt,
    opacity: 0.55,
  },
  buttonLabel: {
    color: colors.cream,
    fontFamily: fonts.bodyBold,
    fontSize: 24,
    lineHeight: 26,
  },
  valueButton: {
    minWidth: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    color: colors.cream,
    fontFamily: fonts.display,
    fontSize: 40,
    lineHeight: 44,
  },
  input: {
    minWidth: 52,
    textAlign: "center",
    color: colors.cream,
    fontFamily: fonts.display,
    fontSize: 36,
    borderBottomWidth: 2,
    borderBottomColor: colors.gold,
    padding: 0,
  },
});
