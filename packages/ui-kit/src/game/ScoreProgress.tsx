import { StyleSheet, Text, View } from "react-native";
import { HAND_SEQUENCE, PlayerIndex } from "rules-engine";
import { colors, fonts, radii } from "../theme";

const ALL_SEATS: PlayerIndex[] = [0, 1, 2, 3];
/** 2 players per row (Tú/Bot1 on top, Bot2/Bot3 below) rather than 4 stacked rows — roughly halves
 * this section's height, which matters on a real phone's actual usable viewport height (browser
 * chrome eats more of it than Playwright's emulated viewports account for). */
const PLAYER_ROWS: PlayerIndex[][] = [
  [0, 1],
  [2, 3],
];
/** 10 today, but derived from the same source `game.handIndex`/`handNumber` count against, so a
 * future rule change to the hand count never needs a second place updated. */
const TOTAL_HANDS = HAND_SEQUENCE.length;
/** Floor for the per-player bar scale — without this, a single small score early in the game
 * (e.g. -20 after hand 1) would stretch its own bar to the full track width, looking maxed-out
 * rather than "barely started." Chosen well below any hand's typical single-hand swing. */
const MIN_BAR_SCALE = 100;

export interface ScoreProgressProps {
  /** 1-10. */
  handNumber: number;
  scores: Record<PlayerIndex, number>;
  seatLabels: Record<PlayerIndex, string>;
}

/**
 * Replaces a bare "Tú: 0  Bot 1: 0 ..." score line with two small progress bars: how far through
 * the 10-hand game this is, and where each player's running score stands relative to the others
 * right now — matching the King Bobola reference's "23/5"-style progress-bar treatment (see
 * .claude/skills/king-ui-modernization). King has no race-to-a-fixed-target score the way some
 * other games in this genre do (positive/negative hands are fixed-sum, not a first-to-N race), so
 * "progress toward target" here is the two things that genuinely are already known and bounded:
 * hand-count progress (N of 10, always available as `handNumber`) and each player's score relative
 * to the current spread among all four (a zero-centered bar, gold for positive / red for negative,
 * scaled to whoever's furthest from zero right now) — not a fabricated target field. Presentational
 * only: every prop here is data `ScorePanel` already receives from the game screen. Player rows lay
 * out 2-per-row (`PLAYER_ROWS`), not stacked 4-deep, to keep this compact enough that it doesn't
 * eat into the vertical room the table and the player's own hand need below it.
 */
export function ScoreProgress({ handNumber, scores, seatLabels }: ScoreProgressProps) {
  const maxMagnitude = Math.max(MIN_BAR_SCALE, ...ALL_SEATS.map((seat) => Math.abs(scores[seat])));

  function renderPlayer(seat: PlayerIndex) {
    const score = scores[seat];
    const positive = score >= 0;
    const fraction = Math.min(1, Math.abs(score) / maxMagnitude);
    return (
      <View key={seat} style={styles.playerCell}>
        <Text style={styles.playerName} numberOfLines={1}>
          {seatLabels[seat]}
        </Text>
        <View style={styles.barTrack}>
          <View style={styles.barCenter} />
          <View
            style={[
              styles.barFill,
              positive ? styles.barFillPositive : styles.barFillNegative,
              positive ? { left: "50%", width: `${fraction * 50}%` } : { right: "50%", width: `${fraction * 50}%` },
            ]}
          />
        </View>
        <Text style={[styles.playerScore, positive ? styles.scorePositive : styles.scoreNegative]}>{score}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.handRow}>
        <Text style={styles.handLabel}>
          {handNumber}/{TOTAL_HANDS}
        </Text>
        <View style={styles.handTrack}>
          <View style={[styles.handFill, { width: `${(handNumber / TOTAL_HANDS) * 100}%` }]} />
        </View>
      </View>
      {PLAYER_ROWS.map((row, i) => (
        <View key={i} style={styles.playerRow}>
          {row.map((seat) => renderPlayer(seat))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    maxWidth: 320,
    gap: 4,
  },
  handRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  handLabel: {
    color: colors.cream,
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    minWidth: 34,
  },
  handTrack: {
    flex: 1,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.feltWell,
    overflow: "hidden",
  },
  handFill: {
    height: "100%",
    backgroundColor: colors.gold,
    borderRadius: radii.pill,
  },
  playerRow: {
    flexDirection: "row",
    gap: 14,
  },
  playerCell: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    minWidth: 0,
  },
  playerName: {
    width: 40,
    color: colors.secondaryText,
    fontFamily: fonts.body,
    fontSize: 11,
  },
  barTrack: {
    flex: 1,
    height: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.feltWell,
    overflow: "hidden",
    position: "relative",
  },
  barCenter: {
    position: "absolute",
    left: "50%",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: colors.muted,
  },
  barFill: {
    position: "absolute",
    top: 0,
    bottom: 0,
    borderRadius: radii.pill,
  },
  barFillPositive: {
    backgroundColor: colors.gold,
  },
  barFillNegative: {
    backgroundColor: colors.heart,
  },
  playerScore: {
    width: 30,
    textAlign: "right",
    fontFamily: fonts.bodySemi,
    fontSize: 11,
  },
  scorePositive: {
    color: colors.gold,
  },
  scoreNegative: {
    color: colors.heart,
  },
});
