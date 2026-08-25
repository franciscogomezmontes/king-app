import { StyleSheet, Text, View } from "react-native";
import type { ImageSourcePropType } from "react-native";
import { colors, fonts, spacing } from "../theme";
import { Avatar } from "./Avatar";
import { CardBack, CardBackStyle } from "./CardBack";
import { TrickPile } from "./TrickPile";

export interface OpponentSeatProps {
  label: string;
  /** Real portrait art, if any — omit for Avatar's placeholder silhouette. */
  avatarSource?: ImageSourcePropType;
  cardCount: number;
  isCurrentTurn: boolean;
  /** How many tricks this opponent has won so far this hand. */
  tricksWon: number;
  /** Whether this seat is dealing the current hand — always shown, independent of whose turn it is. */
  isDealer: boolean;
  /** Which face-down pattern to render for this opponent's hidden hand — the player's Settings
   * choice. Defaults to CardBack's own default ("royal") when omitted. */
  cardBackStyle?: CardBackStyle;
}

// An opponent's own hidden hand is secondary information, not a card in play — a bit smaller than
// the table-cluster's own "table"-face cards, freeing up vertical room overall. Bumped 0.82 -> 0.95
// once Phase 6's trick-cluster shrink (see Table.tsx's own TRICK_CARD_SCALE) freed enough vertical
// room to spend some of it back here — per Francisco's "aun tenemos espacio" feedback.
const CARD_BACK_SCALE = 0.95;

/** An opponent's seat: name, a face-down card-back with their avatar overlaid as a corner badge
 * (rather than a separate stacked portrait above it — see Francisco's "aprovechar mejor el
 * espacio" layout request), and a compact row below combining their remaining card count with
 * their pile of tricks won so far — previously two separate stacked rows, which is what put the
 * top-seat opponent's trick pile awkwardly right under their cards. Their card for the trick in
 * progress shows in the table's center pile instead (see Table), not pinned to their seat. */
export function OpponentSeat({
  label,
  avatarSource,
  cardCount,
  isCurrentTurn,
  tricksWon,
  isDealer,
  cardBackStyle,
}: OpponentSeatProps) {
  return (
    <View style={styles.container}>
      <Text style={[styles.name, isCurrentTurn && styles.nameActive]} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.cardBackWrap}>
        <CardBack variant={cardBackStyle} scale={CARD_BACK_SCALE} />
        <View style={styles.avatarBadge}>
          <Avatar name={label} imageSource={avatarSource} isActive={isCurrentTurn} isDealer={isDealer} size="sm" showName={false} />
        </View>
      </View>
      <View style={styles.belowRow}>
        <Text style={styles.count}>×{cardCount}</Text>
        <TrickPile count={tricksWon} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  name: {
    color: colors.cream,
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    maxWidth: 90,
    marginBottom: 4,
    // Nudges the centered name block left of the card-back's own center — the bigger avatar
    // badge (see CARD_BACK_SCALE/avatarBadge below) now overhangs the card's top-right corner far
    // enough to sit under a name that's dead-centered above it, per Francisco's report.
    marginRight: 16,
  },
  nameActive: {
    color: colors.gold,
  },
  cardBackWrap: {
    marginTop: 4,
  },
  avatarBadge: {
    position: "absolute",
    top: -14,
    right: -10,
  },
  belowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  count: {
    color: colors.secondaryText,
    fontFamily: fonts.body,
    fontSize: 12,
  },
});
