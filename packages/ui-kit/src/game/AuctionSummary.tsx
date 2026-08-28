import { Pressable, StyleSheet, Text, View } from "react-native";
import type { PlayerIndex, PositiveHandSetup } from "rules-engine";
import { useTranslation } from "../i18n";
import { colors, fonts, radii, spacing } from "../theme";
import { SUIT_SYMBOLS } from "./PlayingCard";

export interface AuctionSummaryProps {
  positiveSetup: PositiveHandSetup;
  seatLabels: Record<PlayerIndex, string>;
  /** When provided, the whole summary becomes tappable (toggling this) and shows a small chevron
   * hinting there's more detail available — the caller renders the actual expanded detail (e.g.
   * ui-kit's own AuctionLog) itself right below this component; this one only owns the toggle
   * affordance. Omit when there's nothing to expand into (trump was named directly, no auction). */
  onPress?: () => void;
  /** Whether the caller's own expanded detail is currently shown — flips the chevron. Ignored if
   * `onPress` is omitted. */
  expanded?: boolean;
}

/**
 * A persistent summary of how this positive hand's trump got decided — who ended up naming it
 * (directly, or by winning the auction and for how many tricks), and what the trump actually is.
 * Once trump-selection resolves, none of that context was visible anywhere during play; this
 * keeps it on screen for the rest of the hand instead of only flashing by in a decision prompt.
 */
export function AuctionSummary({ positiveSetup, seatLabels, onPress, expanded = false }: AuctionSummaryProps) {
  const { t } = useTranslation();
  const trumpLabel = positiveSetup.trump === null ? t("game:trump.noTrump") : SUIT_SYMBOLS[positiveSetup.trump];

  const content = (
    <>
      <View style={styles.textRow}>
        <Text style={styles.text}>
          {positiveSetup.auction
            ? t("game:auctionSummary.won", {
                name: seatLabels[positiveSetup.auction.winner],
                tricks: positiveSetup.auction.bid,
              })
            : t("game:auctionSummary.declared", { name: seatLabels[positiveSetup.trumpNamer] })}
        </Text>
        {onPress !== undefined && <Text style={styles.chevron}>{expanded ? "▾" : "▸"}</Text>}
      </View>
      <Text style={styles.trumpText}>
        {t("game:auctionSummary.trump")}: {trumpLabel}
        {positiveSetup.direction === "down" ? " · " + t("rules:playingDirection.down") : ""}
        {positiveSetup.backwards ? " · " + t("rules:ruleToggles.backwardsEnabled.name") : ""}
      </Text>
    </>
  );

  if (onPress === undefined) {
    return <View style={styles.container}>{content}</View>;
  }
  return (
    <Pressable style={styles.container} onPress={onPress} accessibilityLabel={t("game:auctionSummary.detailsToggle")}>
      {content}
    </Pressable>
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
  textRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  text: {
    color: colors.secondaryText,
    fontFamily: fonts.body,
    fontSize: 12,
    textAlign: "center",
  },
  chevron: {
    color: colors.gold,
    fontSize: 11,
  },
  trumpText: {
    color: colors.cream,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    marginTop: 2,
  },
});
