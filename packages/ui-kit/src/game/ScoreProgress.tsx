import { StyleSheet, Text, View } from "react-native";
import { HAND_SEQUENCE, PlayerIndex } from "rules-engine";
import { colors, fonts, radii } from "../theme";

const ALL_SEATS: PlayerIndex[] = [0, 1, 2, 3];
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
 * only: every prop here is data `ScorePanel` already receives from the game screen.
 *
 * Deliberately avoids `flex: 1` for sizing the per-player bars (an earlier version used it inside a
 * `gap`-using row and rendered correctly on Web but collapsed to overlapping, near-zero-width cells
 * on a real Android device — a `flex-grow` computation ambiguous enough that react-native-web's
 * CSS-based engine and RN's native Yoga engine resolved it differently). Every width in this file
 * is either a plain percentage of a parent with its own definite width, or `100%` of a same-file
 * sibling — no flex-grow, no `gap` (also skipped, on the same "fewer edge cases" reasoning).
 */
export function ScoreProgress({ handNumber, scores, seatLabels }: ScoreProgressProps) {
  const maxMagnitude = Math.max(MIN_BAR_SCALE, ...ALL_SEATS.map((seat) => Math.abs(scores[seat])));

  function renderPlayer(seat: PlayerIndex) {
    const score = scores[seat];
    const positive = score >= 0;
    const fraction = Math.min(1, Math.abs(score) / maxMagnitude);
    return (
      <View key={seat} style={styles.playerCell}>
        <View style={styles.playerHeader}>
          <Text style={styles.playerName} numberOfLines={1}>
            {seatLabels[seat]}
          </Text>
          <Text style={[styles.playerScore, positive ? styles.scorePositive : styles.scoreNegative]}>{score}</Text>
        </View>
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
      <View style={styles.playerGrid}>{ALL_SEATS.map((seat) => renderPlayer(seat))}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  handRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  handLabel: {
    color: colors.cream,
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    width: 40,
  },
  handTrack: {
    width: "82%",
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.feltWell,
    borderWidth: 1,
    borderColor: colors.goldMuted,
    overflow: "hidden",
  },
  handFill: {
    height: "100%",
    backgroundColor: colors.gold,
    borderRadius: radii.pill,
  },
  // 2 columns via wrap + a fixed 48% cell width (not flex-grow) — see the component doc comment.
  playerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  playerCell: {
    width: "48%",
    marginBottom: 10,
  },
  playerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  playerName: {
    color: colors.secondaryText,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  playerScore: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
  },
  barTrack: {
    width: "100%",
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.feltWell,
    // A visible border, not just the low-contrast feltWell fill, is what makes the track read as
    // "a bar" even at zero/near-zero score.
    borderWidth: 1,
    borderColor: colors.goldMuted,
    overflow: "hidden",
    position: "relative",
  },
  barCenter: {
    position: "absolute",
    left: "50%",
    top: 0,
    bottom: 0,
    width: 1.5,
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
  scorePositive: {
    color: colors.gold,
  },
  scoreNegative: {
    color: colors.heart,
  },
});
