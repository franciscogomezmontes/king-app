import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, radii, spacing } from "../theme";

export interface SurfaceProps {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}

/** Raised club-table panel — the shared chrome behind auction prompts, home cards, etc. */
export function Surface({ children, style, padded = true }: SurfaceProps) {
  return <View style={[styles.surface, padded && styles.padded, style]}>{children}</View>;
}

/** Alias — some screens read more naturally as a "panel" than a "surface". */
export function Panel(props: SurfaceProps) {
  return <Surface {...props} />;
}

const styles = StyleSheet.create({
  surface: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    width: "100%",
  },
  padded: {
    padding: spacing.md,
  },
});
