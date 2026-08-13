import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";
import { colors, fonts, radii, spacing } from "../theme";

export type ButtonVariant = "primary" | "secondary" | "ghost";

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Shared pressable used by home, GameScreen, and Scorekeeper so those screens stop
 * duplicating the same cream-on-forest button styles.
 */
export function Button({ label, onPress, variant = "primary", disabled = false, style }: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.base, variantStyles[variant], disabled && styles.disabled, style]}
    >
      <Text style={[styles.label, labelStyles[variant]]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    minWidth: 160,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: {
    backgroundColor: colors.surface,
  },
  secondary: {
    backgroundColor: colors.accent,
  },
  ghost: {
    backgroundColor: "transparent",
    minWidth: 0,
    paddingVertical: spacing.sm,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
  },
  primaryLabel: {
    color: colors.cream,
  },
  secondaryLabel: {
    color: colors.cream,
    fontFamily: fonts.bodySemi,
    fontSize: 14,
  },
  ghostLabel: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 14,
  },
});

const variantStyles = {
  primary: styles.primary,
  secondary: styles.secondary,
  ghost: styles.ghost,
} as const;

const labelStyles = {
  primary: styles.primaryLabel,
  secondary: styles.secondaryLabel,
  ghost: styles.ghostLabel,
} as const;
