import { StyleSheet, Text, View } from "react-native";
import type { Card, PlayerIndex } from "rules-engine";
import { DealerBadge } from "./DealerBadge";
import { OpponentSeat } from "./OpponentSeat";
import { CARD_HEIGHT, CARD_WIDTH, PlayingCard } from "./PlayingCard";
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
}

/**
 * The table view: the 3 opponents arranged left/top/right around the human (always at the
 * bottom, via `seatPosition`), each showing their remaining card count and face-down trick pile.
 * The current trick's cards collect at the center of the table, laid out in a small non-
 * overlapping plus/cross (one slot per compass direction) rather than stacked on top of each
 * other — every card's corner index stays fully visible at all times, including the first card
 * played, not just whichever one ends up on top of a pile. Still reads as "the trick, in the
 * middle of the table" (the standard trick-taking card game convention) without trading away
 * legibility for it.
 */
export function Table({ humanSeat, dealer, handSizes, tricksWon, currentTrick, seatLabels, currentTurn }: TableProps) {
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
      />
    );
  }

  function renderTrickCard(position: SeatPosition) {
    const playedCard = playAt.get(position);
    return <View style={styles.trickSlot}>{playedCard && <PlayingCard card={playedCard} />}</View>;
  }

  return (
    <View style={styles.table}>
      <View style={styles.topRow}>{renderOpponent("top")}</View>
      <View style={styles.middleRow}>
        {renderOpponent("left")}
        <View style={styles.cluster}>
          {renderTrickCard("top")}
          <View style={styles.clusterMiddleRow}>
            {renderTrickCard("left")}
            <View style={styles.clusterGap}>
              {currentTrick.length === 0 && <Text style={styles.centerDash}>—</Text>}
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
    </View>
  );
}

const styles = StyleSheet.create({
  table: {
    width: "100%",
    alignItems: "center",
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
    width: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  trickSlot: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  centerDash: {
    color: "#8fae9c",
    fontSize: 14,
  },
  humanPile: {
    alignItems: "center",
    marginTop: 4,
  },
});
