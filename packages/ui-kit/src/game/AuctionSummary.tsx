import { StyleSheet, Text, View } from "react-native";
import type { PlayerIndex, PositiveHandSetup } from "rules-engine";
import { useTranslation } from "../i18n";
import { colors, fonts, radii, spacing } from "../theme";
import { SUIT_SYMBOLS } from "./PlayingCard";

export interface AuctionSummaryProps {
  positiveSetup: PositiveHandSetup;
  seatLabels: Record<PlayerIndex, string>;
}

/**
 * A persistent summary of how this positive hand's trump got decided — who ended up naming it
 * (directly, or by winning the auction and for how many tricks), and what the trump actually is.
 * Once trump-selection resolves, none of that context was visible anywhere during play; this
 * keeps it on screen for the rest of the hand instead of only flashing by in a decision prompt.
 */
export function AuctionSummary({ positiveSetup, seatLabels }: AuctionSummaryProps) {
  const { t } = useTranslation();
  const trumpLabel = positiveSetup.trump === null ? t("game:trump.noTrump") : SUIT_SYMBOLS[positiveSetup.trump];

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        {positiveSetup.auction
          ? t("game:auctionSummary.won", {
              name: seatLabels[positiveSetup.auction.winner],
              tricks: positiveSetup.auction.bid,
            })
          : t("game:auctionSummary.declared", { name: seatLabels[positiveSetup.trumpNamer] })}
      </Text>
      <Text style={styles.trumpText}>
        {t("game:auctionSummary.trump")}: {trumpLabel}
        {positiveSetup.direction === "down" ? " · " + t("rules:playingDirection.down") : ""}
        {positiveSetup.backwards ? " · " + t("rules:ruleToggles.backwardsEnabled.name") : ""}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    width: "100%",
  },
  text: {
    color: colors.secondaryText,
    fontFamily: fonts.body,
    fontSize: 12,
    textAlign: "center",
  },
  trumpText: {
    color: colors.cream,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    marginTop: 2,
  },
});
