import { StyleSheet, Text, View } from "react-native";
import type { Card, PlayerIndex } from "rules-engine";
import { OpponentSeat } from "./OpponentSeat";
import { CARD_HEIGHT, PlayingCard } from "./PlayingCard";
import { seatPosition } from "./seatPosition";

export interface TableProps {
  humanSeat: PlayerIndex;
  /** Each player's remaining card count, for the opponents' card-back counters. */
  handSizes: Record<PlayerIndex, number>;
  currentTrick: { player: PlayerIndex; card: Card }[];
  seatLabels: Record<PlayerIndex, string>;
  /** Whose turn it is right now, or null when it isn't anyone's card-play turn (e.g. bidding). */
  currentTurn: PlayerIndex | null;
}

/**
 * The table view: the 3 opponents arranged left/top/right around the human (always at the
 * bottom, via `seatPosition`), each showing their remaining card count and — once played — their
 * card for the trick in progress. The human's own played card shows in the center. This is the
 * standard trick-taking card game table convention (Hearts, Spades, every King/Rıfkı
 * implementation) — cards appear near the seat that played them, not in an undifferentiated row.
 */
export function Table({ humanSeat, handSizes, currentTrick, seatLabels, currentTurn }: TableProps) {
  const playedBySeat = new Map(currentTrick.map((play) => [play.player, play.card]));
  const opponents = ([0, 1, 2, 3] as PlayerIndex[]).filter((seat) => seat !== humanSeat);
  const seatAt = new Map(opponents.map((seat) => [seatPosition(seat, humanSeat), seat]));

  function renderOpponent(position: "top" | "left" | "right") {
    const seat = seatAt.get(position);
    if (seat === undefined) return null;
    return (
      <OpponentSeat
        label={seatLabels[seat]}
        cardCount={handSizes[seat]}
        isCurrentTurn={currentTurn === seat}
        playedCard={playedBySeat.get(seat) ?? null}
      />
    );
  }

  const humanPlayedCard = playedBySeat.get(humanSeat) ?? null;

  return (
    <View style={styles.table}>
      <View style={styles.topRow}>{renderOpponent("top")}</View>
      <View style={styles.middleRow}>
        {renderOpponent("left")}
        <View style={styles.center}>
          {humanPlayedCard ? <PlayingCard card={humanPlayedCard} /> : <Text style={styles.centerDash}>—</Text>}
        </View>
        {renderOpponent("right")}
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
  center: {
    alignItems: "center",
    justifyContent: "center",
    height: CARD_HEIGHT,
    flex: 1,
  },
  centerDash: {
    color: "#8fae9c",
    fontSize: 14,
  },
});
