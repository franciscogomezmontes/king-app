import { StyleSheet, Text, View } from "react-native";
import type { PlayerIndex } from "rules-engine";
import { useTranslation } from "../i18n";
import { colors, fonts, radii, spacing } from "../theme";

export type AuctionLogEntry =
  | { type: "open"; dealer: PlayerIndex }
  | { type: "bid"; player: PlayerIndex; tricks: number }
  | { type: "pass"; player: PlayerIndex }
  | { type: "decide"; dealer: PlayerIndex; accepted: boolean; tricks: number };

export interface AuctionLogProps {
  /** Already-resolved, chronologically-ordered history — see apps/mobile/src/game/store.ts, which
   * appends to this alongside its own auction-turn bookkeeping so the two never drift apart. */
  entries: AuctionLogEntry[];
  seatLabels: Record<PlayerIndex, string>;
  /** Whichever seat is the local human — `seatLabels` renders that seat as "You"/"Tú"/etc.
   * (a 2nd-person pronoun), which doesn't grammatically agree with the rest of these entries'
   * default 3rd-person phrasing ("Tú es el dealer" is not valid Spanish) — every entry has a
   * "*You" i18n variant for exactly this seat instead. Omit only if every entry should always use
   * third-person phrasing (e.g. a hypothetical spectator view with no "you" at all). */
  humanSeat?: PlayerIndex | null;
  /** The dealer's accept/decline call is still pending — rendered as a trailing "deciding…" line,
   * since the real `{type: "decide"}` entry only lands in `entries` once they've actually tapped
   * Accept/Keep. `null` while nobody's mid-decision. */
  pendingDecider?: { seat: PlayerIndex; tricks: number } | null;
}

function entryText(
  entry: AuctionLogEntry,
  seatLabels: Record<PlayerIndex, string>,
  humanSeat: PlayerIndex | null,
  t: ReturnType<typeof useTranslation>["t"],
): string {
  switch (entry.type) {
    case "open": {
      const isYou = entry.dealer === humanSeat;
      return t(isYou ? "game:auctionLog.opensYou" : "game:auctionLog.opens", { name: seatLabels[entry.dealer] });
    }
    case "bid": {
      const isYou = entry.player === humanSeat;
      return t(isYou ? "game:auctionLog.bidYou" : "game:auctionLog.bid", {
        name: seatLabels[entry.player],
        tricks: entry.tricks,
      });
    }
    case "pass": {
      const isYou = entry.player === humanSeat;
      return t(isYou ? "game:auctionLog.passYou" : "game:auctionLog.pass", { name: seatLabels[entry.player] });
    }
    case "decide": {
      const isYou = entry.dealer === humanSeat;
      const key = entry.accepted
        ? isYou
          ? "game:auctionLog.acceptedYou"
          : "game:auctionLog.accepted"
        : isYou
          ? "game:auctionLog.declinedYou"
          : "game:auctionLog.declined";
      return t(key, { name: seatLabels[entry.dealer], tricks: entry.tricks });
    }
  }
}

/**
 * A live, ordered transcript of a positive hand's auction: who opened it, every bid and pass in
 * turn order, and the dealer's final accept/decline call. Without this, only the human's own
 * turns to bid ever showed anything — a whole bot-vs-bot bidding war (or a dealer turning down a
 * strong bid, itself a tell about their hand) happened silently in the background. Purely
 * presentational, matching AuctionSummary's role for the post-auction trump/direction recap: no
 * game logic here, just rendering history the caller already resolved.
 */
export function AuctionLog({ entries, seatLabels, humanSeat = null, pendingDecider = null }: AuctionLogProps) {
  const { t } = useTranslation();
  if (entries.length === 0 && pendingDecider === null) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("game:auctionLog.title")}</Text>
      {entries.map((entry, index) => (
        <Text key={index} style={styles.line}>
          {entryText(entry, seatLabels, humanSeat, t)}
        </Text>
      ))}
      {pendingDecider !== null && (
        <Text style={[styles.line, styles.pendingLine]}>
          {t(pendingDecider.seat === humanSeat ? "game:auctionLog.decidingYou" : "game:auctionLog.deciding", {
            name: seatLabels[pendingDecider.seat],
            tricks: pendingDecider.tricks,
          })}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.gold,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    marginBottom: 4,
  },
  line: {
    color: colors.secondaryText,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 16,
  },
  pendingLine: {
    color: colors.cream,
    fontFamily: fonts.bodySemi,
  },
});
