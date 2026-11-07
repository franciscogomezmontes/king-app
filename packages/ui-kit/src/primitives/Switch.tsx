import { Switch as RNSwitch, SwitchProps as RNSwitchProps } from "react-native";
import { colors } from "../theme";

export type SwitchProps = Omit<RNSwitchProps, "trackColor" | "thumbColor">;

/**
 * The app's one boolean on/off control — always a real native switch, never a Pressable standing
 * in for one with a checkmark/label change as the only signal of state (that pattern reads as
 * unclear about whether/how it can be turned on). Bakes in the one visual language every such
 * control in this app uses: gold when on, a visible light sage green — not `colors.surface`, which
 * is nearly the same shade as the felt background — when off, so which state it's in is never
 * ambiguous at a glance.
 */
export function Switch(props: SwitchProps) {
  return <RNSwitch trackColor={{ false: colors.muted, true: colors.gold }} thumbColor={colors.cream} {...props} />;
}
