import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts, radii } from "../theme";

export interface HandCountStepperProps {
  label: string;
  value: number;
  min?: number;
  max: number;
  onChange: (next: number) => void;
  decreaseLabel: string;
  increaseLabel: string;
}

/**
 * One player's numeric entry for the hand currently being recorded — a +/- stepper instead of the
 * system keyboard (per Francisco's own reversal of the family's earlier preference: "es más
 * práctico que se haga con +/- que digitando directamente"). This component only knows its own
 * `value`/`max` — it doesn't know about the other 3 players' counts at all, so the caller
 * (ScorekeeperScreen.tsx) is responsible for passing a `max` that already accounts for what the
 * *other* seats hold, not just the hand type's own raw ceiling (`expectedCountFor` — e.g. 13 for
 * No Tricks, 8 for No Gentlemen, 1 for No King of Hearts): `value + (handTotal - sumOfAllSeats)`,
 * so "+" disables itself once the four counts together can't possibly go any higher, not just
 * once *this* seat individually hits the hand's raw ceiling (a real bug this fixed — e.g. two
 * players could otherwise each reach 13 in No Hearts, for an impossible total of 26). Same visual
 * tell BidStepper already uses for auction bids (GameScreen.tsx) — this component doesn't share
 * that one's code since it needs to render 4 across in a much tighter row, but mirrors its look.
 */
export function HandCountStepper({ label, value, min = 0, max, onChange, decreaseLabel, increaseLabel }: HandCountStepperProps) {
  const canDecrease = value > min;
  const canIncrease = value < max;
  return (
    <View style={styles.container}>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.stepper}>
        <Pressable
          accessibilityLabel={decreaseLabel}
          disabled={!canDecrease}
          hitSlop={8}
          style={[styles.button, !canDecrease && styles.buttonDisabled]}
          onPress={() => onChange(Math.max(min, value - 1))}
        >
          <Text style={styles.buttonLabel}>−</Text>
        </Pressable>
        <Text style={styles.value}>{value}</Text>
        <Pressable
          accessibilityLabel={increaseLabel}
          disabled={!canIncrease}
          hitSlop={8}
          style={[styles.button, !canIncrease && styles.buttonDisabled]}
          onPress={() => onChange(Math.min(max, value + 1))}
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
    flex: 1,
  },
  label: {
    color: colors.secondaryText,
    fontFamily: fonts.body,
    fontSize: 12,
    marginBottom: 4,
  },
  stepper: {
    alignItems: "center",
    gap: 4,
  },
  button: {
    width: "100%",
    minWidth: 32,
    backgroundColor: colors.cream,
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonLabel: {
    fontSize: 18,
    fontFamily: fonts.bodyBold,
    color: colors.ink,
    // Pulls the glyph's own visual weight up to its box's true center — same fix as GameScreen.tsx's
    // BidStepper, "−"/"+" both sit slightly below center in this font at this size otherwise.
    marginTop: -2,
  },
  // Deliberately wider and a touch bigger than the +/- buttons above/below it — Francisco found
  // the three same-sized boxes confusing to scan at a glance, the value being the one that
  // actually matters most here.
  value: {
    width: "100%",
    minWidth: 44,
    textAlign: "center",
    color: colors.ink,
    backgroundColor: colors.cream,
    fontFamily: fonts.bodyBold,
    fontSize: 20,
    borderRadius: radii.sm,
    paddingVertical: 6,
  },
});
