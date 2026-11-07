import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts, radii, spacing } from "../theme";

export interface SegmentedToggleOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedToggleProps<T extends string> {
  options: [SegmentedToggleOption<T>, SegmentedToggleOption<T>];
  value: T;
  onChange: (value: T) => void;
  label?: string;
}

/**
 * A two-way segmented control — both choices always on screen, with the active one filled in gold
 * so which way it's set is obvious at a glance. Built for choices where a single tappable text
 * line (toggling silently on press) was reported as unclear about which state was active — e.g.
 * Scorekeeper's Playing Up/Down choice.
 */
export function SegmentedToggle<T extends string>({ options, value, onChange, label }: SegmentedToggleProps<T>) {
  return (
    <View style={styles.container}>
      {label !== undefined && <Text style={styles.label}>{label}</Text>}
      <View style={styles.row}>
        {options.map((option) => {
          const active = option.value === value;
          return (
            <Pressable
              key={option.value}
              style={[styles.segment, active && styles.segmentActive]}
              onPress={() => onChange(option.value)}
            >
              <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>{option.label}</Text>
            </Pressable>
          );
        })}
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
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 3,
  },
  segment: {
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    minWidth: 88,
    alignItems: "center",
  },
  segmentActive: {
    backgroundColor: colors.gold,
  },
  segmentLabel: {
    color: colors.secondaryText,
    fontFamily: fonts.bodySemi,
    fontSize: 13,
  },
  segmentLabelActive: {
    color: colors.ink,
  },
});
