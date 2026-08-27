import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import type { ImageSourcePropType } from "react-native";
import type { Card, PlayerIndex } from "rules-engine";
import { colors, fonts, radii, spacing } from "../theme";
import { Avatar } from "./Avatar";
import { CardBackStyle } from "./CardBack";
import { OpponentSeat } from "./OpponentSeat";
import { CARD_HEIGHT, CARD_WIDTH, DEFAULT_FACE_CARD_STYLE, FaceCardStyle, FAN_CARD_WIDTH, PlayingCard } from "./PlayingCard";
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
  /** Real portrait art per opponent seat (Solo vs Computer's bot roster) — omit a seat, or the
   * whole prop, to fall back to Avatar's placeholder silhouette (e.g. Online, before real player
   * avatars exist). */
  avatarSources?: Partial<Record<PlayerIndex, ImageSourcePropType>>;
  /** Whose turn it is right now, or null when it isn't anyone's card-play turn (e.g. bidding). */
  currentTurn: PlayerIndex | null;
  /** The 4 cards of the trick before this one, in play order — shown as a small reference corner
   * so a trick that's already been swept off the center cluster isn't gone for good. Omit or pass
   * null/empty to hide it (the game screen's own "show last trick" setting). */
  lastTrick?: { player: PlayerIndex; card: Card }[] | null;
  lastTrickLabel?: string;
  /** The player's Settings choice for opponents' face-down card backs. Defaults to CardBack's own
   * default ("royal") when omitted. */
  cardBackStyle?: CardBackStyle;
  /** The player's Settings choice for King/Queen/Jack/Ace art (and the number cards' shared
   * background) on every face-up card shown here — the live trick cluster and the "last trick"
   * reference corner. Defaults to `DEFAULT_FACE_CARD_STYLE` when omitted (Online mode doesn't
   * wire this up yet, same as `cardBackStyle` above). */
  faceCardStyle?: FaceCardStyle;
}

function cardKey(card: Card): string {
  return `${card.suit}${card.rank}`;
}

// How long a card takes to fade+scale into a trick slot, and to fade out again once the trick
// clears — deliberately quick (a beat of motion, not a lingering effect) but never zero: a real
// duration is what turns "the card teleported into place" into "the card was just played," which
// is the whole gap between a table that feels alive and one that reads as a slideshow of static
// frames no matter how well-paced the pauses between those frames are.
const CARD_ENTER_MS = 200;
const CARD_EXIT_MS = 150;

// The already-swept-off "last trick" reference corner is deliberately secondary — smaller than
// even the fan-face cards the player's own hand uses, let alone the live table-face cards, per
// Francisco's explicit "esa no tiene que ser tan grande" request.
const LAST_TRICK_CARD_SCALE = 0.72;

// The center cluster reserves a full non-overlapping cross of 4 slots (top/left/right/bottom, see
// the Table doc comment) whether or not a card is actually down in each one — at full table-face
// size that's 3 stacked card-heights (top slot + middle row + bottom slot), by far the tallest
// single element on the whole screen and, empirically, the biggest lever for fitting the table on
// a real (short) phone viewport without scrolling. Same `scale` mechanism CardBack (0.82) and the
// last-trick corner (0.72, above) already use — this is a live trick card, so it stays closer to
// full size than either of those, but still meaningfully smaller than the player's own hand.
// Bigger than a card actually in a player's own hand, and deliberately overlapping (see the
// `SLOT_LAYOUT`/`SLOT_OVERLAP` constants below) rather than the old fully non-overlapping cross —
// per Francisco's request: these are about to matter more once real
// per-suit card-face art lands (figures/pips need to actually read at a glance), and overlap is
// what keeps 4 now-much-bigger cards from ballooning the table's total footprint the way 4
// non-overlapping ones would.
const TRICK_CARD_SCALE = 1.1;

// The cluster used to be a flex column (top slot, then a middleRow of left/right, then a bottom
// slot), each pulled up to overlap the previous one via negative margins — simple, but it makes
// the *paint order* (and therefore which card visually sits in front where two overlap) a fixed
// function of compass position (top always behind, bottom always in front) no matter which player
// actually played first. Reported live: the trick's leader (left seat, played first) ended up
// visually *behind* a card played later (top seat) — backwards; a real pile of thrown-down cards
// stacks in the order they landed, not by which side of the table they came from. Fixed by
// switching every slot to an absolutely-positioned sibling within one shared stacking context
// (`cluster`), with these constants replicating the exact same visual footprint the old flex
// layout produced, so this is a paint-order fix, not a re-layout — and a single `zIndex` per slot,
// computed from `currentTrick`'s own play order below, now actually governs who's in front.
const SLOT_WIDTH = CARD_WIDTH * TRICK_CARD_SCALE;
const SLOT_HEIGHT = CARD_HEIGHT * TRICK_CARD_SCALE;
const SLOT_GAP = 4;
const SLOT_OVERLAP = SLOT_HEIGHT * 0.42;
const CLUSTER_WIDTH = SLOT_WIDTH * 2 + SLOT_GAP;
const MIDDLE_ROW_TOP = SLOT_HEIGHT - SLOT_OVERLAP;
const BOTTOM_ROW_TOP = MIDDLE_ROW_TOP + SLOT_HEIGHT - SLOT_OVERLAP;
const CLUSTER_HEIGHT = BOTTOM_ROW_TOP + SLOT_HEIGHT;
const CENTERED_LEFT = (CLUSTER_WIDTH - SLOT_WIDTH) / 2;

const SLOT_LAYOUT: Record<SeatPosition, { left: number; top: number }> = {
  top: { left: CENTERED_LEFT, top: 0 },
  left: { left: 0, top: MIDDLE_ROW_TOP },
  right: { left: SLOT_WIDTH + SLOT_GAP, top: MIDDLE_ROW_TOP },
  bottom: { left: CENTERED_LEFT, top: BOTTOM_ROW_TOP },
};

const FELT_WELL_WIDTH = 24;
const FELT_WELL_HEIGHT = 18;
const FELT_WELL_LEFT = SLOT_WIDTH + SLOT_GAP / 2 - FELT_WELL_WIDTH / 2;
const FELT_WELL_TOP = MIDDLE_ROW_TOP + (SLOT_HEIGHT - FELT_WELL_HEIGHT) / 2;

/**
 * A fixed, small tilt + nudge per compass position — cards thrown down "casually," like a real
 * hand of cards landing slightly askew, rather than perfectly grid-aligned. Deliberately subtle (a
 * few degrees, a few px): each card stays fully inside its own slot with its corner index still
 * completely readable — this is a per-card physicality cue, not a re-layout into an overlapping
 * fan, which would hide corners and undo the "every card's index stays visible" property the
 * compass-cross layout exists for (see the `Table` doc comment below).
 */
const TRICK_CARD_TILT: Record<SeatPosition, { rotate: string; translateX: number; translateY: number }> = {
  top: { rotate: "-3deg", translateX: -2, translateY: 0 },
  left: { rotate: "4deg", translateX: 0, translateY: -2 },
  right: { rotate: "-4deg", translateX: 0, translateY: 2 },
  bottom: { rotate: "3deg", translateX: 2, translateY: 0 },
};

/**
 * One trick-pile slot, animated. A card fades and scales in the instant it's newly played here,
 * and — since the parent only ever tells us "there's a card" or "there isn't" — fades out in
 * place once the trick clears, rather than vanishing in the same React commit the parent stops
 * passing one. `displayCard` intentionally lags one step behind the `card` prop for exactly the
 * `CARD_EXIT_MS` it takes to play that exit, so there's always something on screen to animate.
 * Skips the entrance animation on first mount (e.g. a resumed game reopening mid-trick) — only
 * actual card-to-card or card-to-empty transitions animate. `position`'s only job is picking this
 * slot's fixed tilt (`TRICK_CARD_TILT`) — it never varies per card, only per compass slot.
 */
function TrickSlot({
  card,
  position,
  faceCardStyle,
}: {
  card: Card | null;
  position: SeatPosition;
  faceCardStyle: FaceCardStyle;
}) {
  const [displayCard, setDisplayCard] = useState(card);
  const mounted = useRef(false);
  const opacity = useRef(new Animated.Value(card ? 1 : 0)).current;
  const scale = useRef(new Animated.Value(card ? 1 : 0.85)).current;
  const tilt = TRICK_CARD_TILT[position];

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (card) {
      setDisplayCard(card);
      opacity.setValue(0);
      scale.setValue(0.85);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: CARD_ENTER_MS, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: CARD_ENTER_MS, useNativeDriver: true }),
      ]).start();
      return;
    }
    Animated.timing(opacity, { toValue: 0, duration: CARD_EXIT_MS, useNativeDriver: true }).start();
    // `displayCard` is cleared by this plain JS timer, deliberately *not* the animation's own
    // `.start(callback)` completion callback — that callback is delivered by the native side
    // (`useNativeDriver: true` runs the fade on the native UI thread, independent of the JS
    // thread, including while JS is blocked by a long synchronous computation like Experto's
    // ~900ms ISMCTS search; see ismcts.ts), and this codebase hit a real, repeated bug (an
    // opponent's newly-led card going invisible) trying to make that callback safe by checking
    // "is the target still null" at the moment it fires — sound in the orderings reasoned through
    // at the time, but native-bridge callback delivery relative to JS's own microtask/state-update
    // ordering isn't a guarantee this code can lean on, and evidently some ordering it allowed for
    // still let a stale clear win. A `setTimeout` owned entirely by JS sidesteps that class of bug
    // rather than trying to out-guess it: if a *new* card lands in this same slot before this timer
    // fires, this whole effect re-runs for that new value, and React's own effect-cleanup below
    // cancels this exact timer *before* the new one's own logic runs — a guarantee React itself
    // provides, not one this code has to reconstruct by reasoning about a native callback's timing.
    const timer = setTimeout(() => setDisplayCard(null), CARD_EXIT_MS);
    return () => clearTimeout(timer);
    // Only the card's identity (suit+rank, or absence) should re-trigger this — not `displayCard`,
    // which this effect itself updates (that would either loop or skip the exit animation).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card ? cardKey(card) : null]);

  return (
    <View style={styles.trickSlot}>
      {displayCard && (
        <Animated.View
          style={{
            opacity,
            transform: [{ scale }, { rotate: tilt.rotate }, { translateX: tilt.translateX }, { translateY: tilt.translateY }],
          }}
        >
          <PlayingCard card={displayCard} faceCardStyle={faceCardStyle} scale={TRICK_CARD_SCALE} />
        </Animated.View>
      )}
    </View>
  );
}

/**
 * The table view: the 3 opponents arranged left/top/right around the human (always at the
 * bottom, via `seatPosition`), each showing their remaining card count and face-down trick pile.
 * The current trick's cards collect at the center of the table, laid out in a small plus/cross
 * (one slot per compass direction) that deliberately overlaps at the edges — cards thrown down
 * like a real hand would, not a perfect non-overlapping grid. Which card visually sits in front
 * where two overlap follows actual play order (see the `zIndexByPosition` map below), not compass
 * position — the trick's leader always ends up furthest back, each later play stacks further in
 * front, regardless of which seat played it. Each slot's card also gets a small, fixed tilt
 * (`TRICK_CARD_TILT`) on top of that. An empty trick is a quiet felt well, not an em-dash.
 */
export function Table({
  humanSeat,
  dealer,
  handSizes,
  tricksWon,
  currentTrick,
  seatLabels,
  avatarSources,
  currentTurn,
  lastTrick,
  lastTrickLabel,
  cardBackStyle,
  faceCardStyle = DEFAULT_FACE_CARD_STYLE,
}: TableProps) {
  const opponents = ([0, 1, 2, 3] as PlayerIndex[]).filter((seat) => seat !== humanSeat);
  const seatAt = new Map(opponents.map((seat) => [seatPosition(seat, humanSeat), seat]));
  const playAt = new Map(currentTrick.map((play) => [seatPosition(play.player, humanSeat), play.card]));
  // 1-based play order (the leader is 1, i.e. furthest back) — every slot's own `zIndex` below
  // reads from this instead of a fixed per-compass-position stacking order. A slot with no card
  // played yet this trick just never looks anything up here; its `?? 0` default never matters
  // since there's nothing in it to paint.
  const zIndexByPosition = new Map<SeatPosition, number>(
    currentTrick.map((play, index) => [seatPosition(play.player, humanSeat), index + 1]),
  );

  function renderOpponent(position: "top" | "left" | "right") {
    const seat = seatAt.get(position);
    if (seat === undefined) return null;
    return (
      <OpponentSeat
        label={seatLabels[seat]}
        avatarSource={avatarSources?.[seat]}
        cardCount={handSizes[seat]}
        tricksWon={tricksWon[seat]}
        isCurrentTurn={currentTurn === seat}
        isDealer={dealer === seat}
        cardBackStyle={cardBackStyle}
      />
    );
  }

  function renderTrickCard(position: SeatPosition) {
    const layout = SLOT_LAYOUT[position];
    const zIndex = zIndexByPosition.get(position) ?? 0;
    return (
      <View style={[styles.trickSlotAbs, { left: layout.left, top: layout.top, zIndex, elevation: zIndex }]}>
        <TrickSlot card={playAt.get(position) ?? null} position={position} faceCardStyle={faceCardStyle} />
      </View>
    );
  }

  return (
    <View style={styles.felt}>
      <View style={styles.topRow}>{renderOpponent("top")}</View>
      <View style={styles.middleRow}>
        {renderOpponent("left")}
        <View style={styles.cluster}>
          {renderTrickCard("top")}
          {renderTrickCard("left")}
          {renderTrickCard("right")}
          {renderTrickCard("bottom")}
          {currentTrick.length === 0 && <View style={[styles.feltWell, styles.feltWellAbs]} />}
        </View>
        {renderOpponent("right")}
      </View>
      <View style={styles.humanPile}>
        <Avatar
          name={seatLabels[humanSeat]}
          imageSource={avatarSources?.[humanSeat]}
          isActive={currentTurn === humanSeat}
          isDealer={dealer === humanSeat}
          size="sm"
          // The human's own name now shows next to their avatar too — the same "name visible
          // beside the portrait" treatment OpponentSeat's own name text gives every opponent, per
          // Francisco's explicit request.
          showName
        />
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
              <PlayingCard
                key={`${play.player}-${index}`}
                card={play.card}
                face="fan"
                faceCardStyle={faceCardStyle}
                scale={LAST_TRICK_CARD_SCALE}
              />
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
    paddingVertical: spacing.xs,
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
  // Fixed-size and `position: "relative"` — the shared stacking context every trick slot below is
  // absolutely positioned within, so a single `zIndex` per slot (see `renderTrickCard`) reliably
  // governs paint order between all 4 of them, not just next-door siblings. `CLUSTER_WIDTH`/
  // `CLUSTER_HEIGHT` reproduce the exact footprint the old flex-plus-negative-margins layout
  // produced — this is a paint-order fix, not a re-layout.
  cluster: {
    position: "relative",
    width: CLUSTER_WIDTH,
    height: CLUSTER_HEIGHT,
  },
  trickSlotAbs: {
    position: "absolute",
  },
  feltWell: {
    width: FELT_WELL_WIDTH,
    height: FELT_WELL_HEIGHT,
    borderRadius: 9,
    backgroundColor: colors.feltWell,
    borderWidth: 1,
    borderColor: colors.goldMuted,
  },
  feltWellAbs: {
    position: "absolute",
    left: FELT_WELL_LEFT,
    top: FELT_WELL_TOP,
  },
  trickSlot: {
    width: CARD_WIDTH * TRICK_CARD_SCALE,
    height: CARD_HEIGHT * TRICK_CARD_SCALE,
  },
  humanPile: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
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
    width: FAN_CARD_WIDTH * LAST_TRICK_CARD_SCALE * 2 + 4,
    gap: 4,
  },
});
