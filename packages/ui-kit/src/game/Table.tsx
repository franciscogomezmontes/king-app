import { StyleSheet, Text, View } from "react-native";
import type { Card, PlayerIndex } from "rules-engine";
import { OpponentSeat } from "./OpponentSeat";
import { CARD_HEIGHT, CARD_WIDTH, PlayingCard } from "./PlayingCard";
import { seatPosition, SeatPosition } from "./seatPosition";
import { TrickPile } from "./TrickPile";

export interface TableProps {
  humanSeat: PlayerIndex;
  /** Each player's remaining card count, for the opponents' card-back counters. */
  handSizes: Record<PlayerIndex, number>;
  /** Each player's tricks won so far this hand, for their face-down pile. */
  tricksWon: Record<PlayerIndex, number>;
  currentTrick: { player: PlayerIndex; card: Card }[];
  seatLabels: Record<PlayerIndex, string>;
  /** Whose turn it is right now, or null when it isn't anyone's card-play turn (e.g. bidding). */
  currentTurn: PlayerIndex | null;
}

const CLUSTER_SIZE = 168;
const CLUSTER_CARD_TOP = (CLUSTER_SIZE - CARD_HEIGHT) / 2;
const CLUSTER_CARD_LEFT = (CLUSTER_SIZE - CARD_WIDTH) / 2;

// Nudges each played card from dead-center toward the seat that played it, so the pile still
// reads as "who played what" while staying a single cluster in the middle of the table — the
// convention most trick-taking apps use, rather than pinning cards next to each opponent's seat.
const CLUSTER_OFFSET: Record<SeatPosition, { top: number; left: number }> = {
  top: { top: -16, left: 0 },
  bottom: { top: 16, left: 0 },
  left: { top: 0, left: -22 },
  right: { top: 0, left: 22 },
};

/**
 * The table view: the 3 opponents arranged left/top/right around the human (always at the
 * bottom, via `seatPosition`), each showing their remaining card count and face-down trick pile.
 * The current trick's cards collect in a single pile at the center of the table — nudged toward
 * whichever seat played them, and stacked in play order (first play at the back, most recent on
 * top) — rather than sitting next to each seat. This is the standard trick-taking card game table
 * convention (Hearts, Spades, every King/Rıfkı implementation).
 */
export function Table({ humanSeat, handSizes, tricksWon, currentTrick, seatLabels, currentTurn }: TableProps) {
  const opponents = ([0, 1, 2, 3] as PlayerIndex[]).filter((seat) => seat !== humanSeat);
  const seatAt = new Map(opponents.map((seat) => [seatPosition(seat, humanSeat), seat]));

  function renderOpponent(position: "top" | "left" | "right") {
    const seat = seatAt.get(position);
    if (seat === undefined) return null;
    return (
      <OpponentSeat
        label={seatLabels[seat]}
        cardCount={handSizes[seat]}
        tricksWon={tricksWon[seat]}
        isCurrentTurn={currentTurn === seat}
      />
    );
  }

  return (
    <View style={styles.table}>
      <View style={styles.topRow}>{renderOpponent("top")}</View>
      <View style={styles.middleRow}>
        {renderOpponent("left")}
        <View style={styles.cluster}>
          {currentTrick.length === 0 ? (
            <Text style={styles.centerDash}>—</Text>
          ) : (
            currentTrick.map((play, index) => {
              const offset = CLUSTER_OFFSET[seatPosition(play.player, humanSeat)];
              return (
                <View
                  key={play.player}
                  style={[
                    styles.clusterCard,
                    { top: CLUSTER_CARD_TOP + offset.top, left: CLUSTER_CARD_LEFT + offset.left, zIndex: index },
                  ]}
                >
                  <PlayingCard card={play.card} />
                </View>
              );
            })
          )}
        </View>
        {renderOpponent("right")}
      </View>
      <View style={styles.humanPile}>
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
    width: CLUSTER_SIZE,
    height: CLUSTER_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  clusterCard: {
    position: "absolute",
    top: CLUSTER_CARD_TOP,
    left: CLUSTER_CARD_LEFT,
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
