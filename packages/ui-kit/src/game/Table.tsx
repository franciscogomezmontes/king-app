import { StyleSheet, Text, View } from "react-native";
import type { Card, PlayerIndex } from "rules-engine";
import { colors, fonts, radii, spacing } from "../theme";
import { CardBackStyle } from "./CardBack";
import { DealerBadge } from "./DealerBadge";
import { OpponentSeat } from "./OpponentSeat";
import { CARD_HEIGHT, CARD_WIDTH, FAN_CARD_WIDTH, PlayingCard } from "./PlayingCard";
import { seatPosition, SeatPosition } from "./seatPosition";
import { TrickPile } from "./TrickPile";

export interface TableProps {
  humanSeat: PlayerIndex;
  /** Who's dealing the current hand — always shown, independent of currentTurn. */
  dealer: PlayerIndex;
  /** Each player's remaining card count, for the opponents' card-back counters. */
  handSizes: Record<PlayerIndex, number>;
  /** Each player's tricks won so far this hand, for their face-down pile. */
  tricksWon: Record<PlayerIndex, number>;
  currentTrick: { player: PlayerIndex; card: Card }[];
  seatLabels: Record<PlayerIndex, string>;
  /** Whose turn it is right now, or null when it isn't anyone's card-play turn (e.g. bidding). */
  currentTurn: PlayerIndex | null;
  /** The 4 cards of the trick before this one, in play order — shown as a small reference corner
   * so a trick that's already been swept off the center cluster isn't gone for good. Omit or pass
   * null/empty to hide it (the game screen's own "show last trick" setting). */
  lastTrick?: { player: PlayerIndex; card: Card }[] | null;
  lastTrickLabel?: string;
  /** The player's Settings choice for opponents' face-down card backs. Defaults to CardBack's own
   * default ("lattice") when omitted. */
  cardBackStyle?: CardBackStyle;
}

/**
 * The table view: the 3 opponents arranged left/top/right around the human (always at the
 * bottom, via `seatPosition`), each showing their remaining card count and face-down trick pile.
 * The current trick's cards collect at the center of the table, laid out in a small non-
 * overlapping plus/cross (one slot per compass direction) rather than stacked on top of each
 * other — every card's corner index stays fully visible at all times, including the first card
 * played, not just whichever one ends up on top of a pile. An empty trick is a quiet felt well,
 * not an em-dash.
 */
export function Table({
  humanSeat,
  dealer,
  handSizes,
  tricksWon,
  currentTrick,
  seatLabels,
  currentTurn,
  lastTrick,
  lastTrickLabel,
  cardBackStyle,
}: TableProps) {
  const opponents = ([0, 1, 2, 3] as PlayerIndex[]).filter((seat) => seat !== humanSeat);
  const seatAt = new Map(opponents.map((seat) => [seatPosition(seat, humanSeat), seat]));
  const playAt = new Map(currentTrick.map((play) => [seatPosition(play.player, humanSeat), play.card]));

  function renderOpponent(position: "top" | "left" | "right") {
    const seat = seatAt.get(position);
    if (seat === undefined) return null;
    return (
      <OpponentSeat
        label={seatLabels[seat]}
        cardCount={handSizes[seat]}
        tricksWon={tricksWon[seat]}
        isCurrentTurn={currentTurn === seat}
        isDealer={dealer === seat}
        cardBackStyle={cardBackStyle}
      />
    );
  }

  function renderTrickCard(position: SeatPosition) {
    const playedCard = playAt.get(position);
    return <View style={styles.trickSlot}>{playedCard && <PlayingCard card={playedCard} />}</View>;
  }

  return (
    <View style={styles.felt}>
      <View style={styles.topRow}>{renderOpponent("top")}</View>
      <View style={styles.middleRow}>
        {renderOpponent("left")}
        <View style={styles.cluster}>
          {renderTrickCard("top")}
          <View style={styles.clusterMiddleRow}>
            {renderTrickCard("left")}
            <View style={styles.clusterGap}>
              {currentTrick.length === 0 && <View style={styles.feltWell} />}
            </View>
            {renderTrickCard("right")}
          </View>
          {renderTrickCard("bottom")}
        </View>
        {renderOpponent("right")}
      </View>
      <View style={styles.humanPile}>
        {dealer === humanSeat && <DealerBadge />}
        <TrickPile count={tricksWon[humanSeat]} />
      </View>
      {lastTrick != null && lastTrick.length > 0 && (
        <View style={styles.lastTrickCorner}>
          {lastTrickLabel !== undefined && (
            <Text style={styles.lastTrickLabel} numberOfLines={1}>
              {lastTrickLabel}
            </Text>
          )}
          <View style={styles.lastTrickGrid}>
            {lastTrick.map((play, index) => (
              <PlayingCard key={`${play.player}-${index}`} card={play.card} face="fan" />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  felt: {
    width: "100%",
    position: "relative",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.goldMuted,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  topRow: {
    alignItems: "center",
    marginBottom: 4,
  },
  middleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  cluster: {
    alignItems: "center",
  },
  clusterMiddleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  clusterGap: {
    width: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  feltWell: {
    width: 24,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.feltWell,
    borderWidth: 1,
    borderColor: colors.goldMuted,
  },
  trickSlot: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  humanPile: {
    alignItems: "center",
    marginTop: 4,
  },
  lastTrickCorner: {
    position: "absolute",
    top: spacing.xs,
    right: spacing.xs,
    alignItems: "flex-end",
    backgroundColor: colors.feltWell,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.goldMuted,
    padding: 4,
  },
  lastTrickLabel: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 9,
    marginBottom: 2,
  },
  // A non-overlapping 2x2 grid rather than a fanned/overlapping row — with only 4 cards to show
  // and no 13-card width budget to respect (unlike the live Hand), overlap just hid each card's
  // suit under its neighbor for no benefit; a fixed two-column width wraps them into 2 rows.
  lastTrickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: FAN_CARD_WIDTH * 2 + 4,
    gap: 4,
  },
});
