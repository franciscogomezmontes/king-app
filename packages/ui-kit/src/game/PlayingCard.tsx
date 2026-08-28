import { Pressable, StyleSheet, Text, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import type { Card, Rank } from "rules-engine";
import { useTranslation } from "../i18n";
import { colors, fonts, radii } from "../theme";

export const SUIT_SYMBOLS: Record<Card["suit"], string> = { S: "♠", H: "♥", D: "♦", C: "♣" };
// Display order for any UI that lets a player pick a suit (e.g. naming trump) — deliberately not
// rules-engine's own `SUITS` array (whose order is an internal implementation detail, unrelated to
// how suits should read on screen). Diamonds, Spades, Hearts, Clubs, per Francisco's request.
export const TRUMP_SUIT_DISPLAY_ORDER: Card["suit"][] = ["D", "S", "H", "C"];
const RED_SUITS = new Set<Card["suit"]>(["H", "D"]);
// Which "rules:rankLabels" key each court rank maps to — the actual letter is locale-dependent
// (see rulesResources.ts's own doc comment: French/German use their real-table abbreviations,
// not the English letters transliterated), so this only maps rank -> key, never rank -> letter.
const RANK_LABEL_KEY: Partial<Record<Rank, "jack" | "queen" | "king" | "ace">> = {
  11: "jack",
  12: "queen",
  13: "king",
  14: "ace",
};
const COURT_RANKS = new Set<Rank>([11, 12, 13]);

export type CardFace = "fan" | "table";

const DIM = {
  fan: { width: 48, height: 78 },
  table: { width: 72, height: 104 },
} as const;

/** Table-face size — used by trick slots and card backs. */
export const CARD_WIDTH = DIM.table.width;
export const CARD_HEIGHT = DIM.table.height;
/** Fan size — used by the overlapping hand. */
export const FAN_CARD_WIDTH = DIM.fan.width;
export const FAN_CARD_HEIGHT = DIM.fan.height;

function rankLabel(rank: Rank, t: (key: string) => string): string {
  const key = RANK_LABEL_KEY[rank];
  return key !== undefined ? t(`rules:rankLabels.${key}`) : String(rank);
}

export function suitColor(suit: Card["suit"]): string {
  return RED_SUITS.has(suit) ? colors.heart : colors.ink;
}

export interface PlayingCardProps {
  card: Card;
  /** `fan` = readable corner index only (hand). `table` = full pips (trick). */
  face?: CardFace;
  onPress?: () => void;
  disabled?: boolean;
  highlighted?: boolean;
  /** Extra style applied to the outer (shadow-casting) wrapper — for a caller that needs to
   * position/rotate the whole card (e.g. Table.tsx's trick cluster) without reaching inside past
   * the shadow layer, which would clip it. Rotation/translation belongs here, not on the inner
   * card body, so the shadow rotates/moves along with the card instead of staying axis-aligned. */
  style?: StyleProp<ViewStyle>;
  /** Uniformly scales the whole card — border, shadow, pips, corner index, all of it — up or down
   * from its natural `face` size, reserving exactly `scale`× that size in layout. A transform
   * rather than a second set of hand-tuned pixel offsets (every internal position in this file is
   * a fixed px value computed for the two `DIM` sizes) — Hand.tsx uses this to size the player's
   * own cards against its actually-measured available width instead of being stuck at `face`'s
   * fixed size. Defaults to 1 (no scaling; every other caller is unaffected). Not combined with
   * `style`'s own `transform` today — the two are independent so neither caller has to know about
   * the other's transform array. */
  scale?: number;
}

/**
 * Face-up card. In a fanned hand the overlapping neighbor hides most of the card, so `face="fan"`
 * draws only a large top-left index — the way a real fan is read. `face="table"` draws the full
 * pip layout in a padded well that does not collide with the corners.
 *
 * Rendered as two nested views, not one, specifically so the card can have both rounded corners
 * *and* a real drop shadow: the inner view owns `overflow: "hidden"` (needed to clip pip content
 * to the rounded card shape), and on iOS/web `shadow*` props are clipped by any ancestor with
 * `overflow: "hidden"` — so the shadow has to live on an outer view that doesn't clip. Android's
 * `elevation` doesn't have this restriction (its shadow is a compositor effect, not clipped by the
 * view it's drawn on), but keeping both on the same outer wrapper is simpler than special-casing
 * per platform and costs nothing.
 */
export function PlayingCard({
  card,
  face = "table",
  onPress,
  disabled = false,
  highlighted = false,
  style,
  scale = 1,
}: PlayingCardProps) {
  const { t } = useTranslation();
  const color = suitColor(card.suit);
  const interactive = onPress !== undefined && !disabled;
  const isAceHearts = card.rank === 14 && card.suit === "H";
  const isKingHearts = card.rank === 13 && card.suit === "H";
  const dim = DIM[face];
  const label = rankLabel(card.rank, t);

  const card_ = (
    <View style={[styles.shadowWrap, { width: dim.width, height: dim.height }, style]}>
      <Pressable
        onPress={interactive ? onPress : undefined}
        disabled={!interactive}
        style={[
          styles.card,
          { width: dim.width, height: dim.height },
          highlighted && styles.cardHighlighted,
          isKingHearts && face === "table" && styles.cardKingHearts,
        ]}
      >
        <CornerIndex label={label} suit={card.suit} color={color} large={face === "fan"} />
        {face === "table" && (
          <>
            <CornerIndex label={label} suit={card.suit} color={color} inverted />
            {COURT_RANKS.has(card.rank) ? (
              <CourtFace label={label} suit={card.suit} color={color} special={isKingHearts} />
            ) : card.rank === 14 ? (
              <AcePip suit={card.suit} color={color} special={isAceHearts} />
            ) : (
              <NumberPips rank={card.rank} suit={card.suit} color={color} />
            )}
          </>
        )}
        {disabled && <View style={styles.shadow} pointerEvents="none" />}
      </Pressable>
    </View>
  );

  if (scale === 1) return card_;

  // Both dimensions explicit on every nested View (never `flex`/shrink-to-fit) — the exact
  // pattern this codebase settled on after a `flex`-sized `<Image>` rendered at native resolution
  // cropped to a corner on Android instead of scaling down (see CardBack.tsx's own doc comment).
  return (
    <View
      style={{
        width: dim.width * scale,
        height: dim.height * scale,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View style={{ width: dim.width, height: dim.height, transform: [{ scale }] }}>{card_}</View>
    </View>
  );
}

function CornerIndex({
  label,
  suit,
  color,
  inverted = false,
  large = false,
}: {
  label: string;
  suit: Card["suit"];
  color: string;
  inverted?: boolean;
  large?: boolean;
}) {
  // A 2-character label ("10", today's only case) needs the narrower style regardless of which
  // locale/rank produced it — locale-proof, unlike checking `rank === 10` directly.
  const wide = label.length > 1;
  return (
    <View style={[styles.corner, inverted ? styles.cornerInverted : styles.cornerTop, large && styles.cornerLarge]}>
      <Text style={[large ? styles.rankFan : styles.rank, wide && !large && styles.rankTen, { color }]}>{label}</Text>
      <Text style={[large ? styles.suitFan : styles.suit, { color }]}>{SUIT_SYMBOLS[suit]}</Text>
    </View>
  );
}

type PipRowSpec = "pair" | "single";

// One entry per row, top to bottom — "pair" = two pips side by side, "single" = one pip centered.
// Row *count* varies from 2 (rank 2) to 6 (rank 10), so a fixed per-row height would either waste
// space on low counts or overflow the card on high ones (rank 10's 6 rows is what visibly broke
// before this was made row-count-aware — see `pipMetrics`).
const NUMBER_PIP_ROWS: Partial<Record<Rank, PipRowSpec[]>> = {
  2: ["single", "single"],
  3: ["single", "single", "single"],
  4: ["pair", "pair"],
  5: ["pair", "single", "pair"],
  6: ["pair", "pair", "pair"],
  7: ["pair", "single", "pair", "pair"],
  8: ["pair", "single", "pair", "single", "pair"],
  9: ["pair", "pair", "single", "pair", "pair"],
  10: ["pair", "single", "pair", "pair", "single", "pair"],
};

/** Shrinks row height/pip size just enough for the row count to fit inside `pipWell` (see its
 * fixed top/bottom offsets below) — ranks with 4 or fewer rows get the original full size. */
function pipMetrics(rowCount: number): { height: number; fontSize: number; lineHeight: number } {
  if (rowCount >= 6) return { height: 10, fontSize: 9, lineHeight: 10 };
  if (rowCount === 5) return { height: 12, fontSize: 11, lineHeight: 12 };
  return { height: 13, fontSize: 13, lineHeight: 14 };
}

function NumberPips({ rank, suit, color }: { rank: Rank; suit: Card["suit"]; color: string }) {
  const rowSpecs = NUMBER_PIP_ROWS[rank] ?? [];
  const { height, fontSize, lineHeight } = pipMetrics(rowSpecs.length);
  const pipStyle = { color, fontSize, lineHeight };

  return (
    <View style={styles.pipWell} pointerEvents="none">
      {rowSpecs.map((spec, index) =>
        spec === "pair" ? (
          <View key={index} style={[styles.pipRow, { height }]}>
            <Text style={[styles.pip, pipStyle]}>{SUIT_SYMBOLS[suit]}</Text>
            <Text style={[styles.pip, pipStyle]}>{SUIT_SYMBOLS[suit]}</Text>
          </View>
        ) : (
          <View key={index} style={[styles.pipCenter, { height }]}>
            <Text style={[styles.pip, pipStyle]}>{SUIT_SYMBOLS[suit]}</Text>
          </View>
        ),
      )}
    </View>
  );
}

function AcePip({ suit, color, special }: { suit: Card["suit"]; color: string; special: boolean }) {
  return (
    <View style={styles.aceCenter} pointerEvents="none">
      {special && <View style={styles.aceRing} />}
      <Text style={[styles.acePip, { color, fontSize: special ? 38 : 34 }]}>{SUIT_SYMBOLS[suit]}</Text>
    </View>
  );
}

function CourtFace({
  label,
  suit,
  color,
  special,
}: {
  label: string;
  suit: Card["suit"];
  color: string;
  special: boolean;
}) {
  return (
    <View style={styles.courtWell} pointerEvents="none">
      <Text style={[styles.courtRank, { color: special ? colors.gold : color }]}>{label}</Text>
      <Text style={[styles.courtSuit, { color }]}>{SUIT_SYMBOLS[suit]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Depth layer — see the component doc comment for why this has to be a separate view from
  // `card` rather than shadow props added directly to it. Values tuned for a card resting flat on
  // felt: a soft, fairly tight shadow, not a dramatic floating-above-the-table look.
  shadowWrap: {
    borderRadius: radii.card,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  card: {
    borderRadius: radii.card,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.felt,
    overflow: "hidden",
  },
  cardHighlighted: {
    borderColor: colors.gold,
    borderWidth: 2,
  },
  cardKingHearts: {
    borderColor: colors.gold,
  },
  corner: {
    position: "absolute",
    alignItems: "center",
    width: 20,
    zIndex: 2,
  },
  cornerLarge: {
    width: 28,
  },
  cornerTop: {
    top: 3,
    left: 3,
  },
  cornerInverted: {
    bottom: 3,
    right: 3,
    transform: [{ rotate: "180deg" }],
  },
  rank: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    lineHeight: 16,
    includeFontPadding: false,
  },
  rankFan: {
    fontFamily: fonts.bodyBold,
    fontSize: 21,
    lineHeight: 23,
    includeFontPadding: false,
  },
  rankTen: {
    fontSize: 13,
    lineHeight: 14,
    letterSpacing: -0.6,
  },
  suit: {
    fontSize: 13,
    lineHeight: 14,
    includeFontPadding: false,
  },
  suitFan: {
    fontSize: 17,
    lineHeight: 18,
    includeFontPadding: false,
  },
  pipWell: {
    position: "absolute",
    top: 20,
    bottom: 20,
    left: 18,
    right: 18,
    justifyContent: "space-between",
  },
  pipRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pipCenter: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  pip: {
    width: 16,
    textAlign: "center",
    includeFontPadding: false,
  },
  aceCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  aceRing: {
    position: "absolute",
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    borderColor: colors.gold,
  },
  acePip: {
    fontSize: 34,
    lineHeight: 38,
    includeFontPadding: false,
  },
  courtWell: {
    position: "absolute",
    top: 22,
    bottom: 22,
    left: 20,
    right: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  courtRank: {
    fontFamily: fonts.display,
    fontSize: 36,
    lineHeight: 38,
    includeFontPadding: false,
  },
  courtSuit: {
    fontSize: 20,
    lineHeight: 22,
    marginTop: 3,
    includeFontPadding: false,
  },
  shadow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radii.card,
    backgroundColor: colors.overlay,
  },
});
