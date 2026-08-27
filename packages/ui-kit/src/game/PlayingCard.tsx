import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import type { ImageSourcePropType, StyleProp, ViewStyle } from "react-native";
import type { Card, Rank } from "rules-engine";
import { useTranslation } from "../i18n";
import { colors, fonts, radii } from "../theme";

export const SUIT_SYMBOLS: Record<Card["suit"], string> = { S: "♠", H: "♥", D: "♦", C: "♣" };
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
// Court ranks plus the Ace — every rank this app has real illustrated art for (see
// FACE_CARD_IMAGES below). Numbers 2-10 keep drawing NUMBER_PIP_ROWS by code, just against an
// illustrated background (NUMBER_BG_IMAGES) instead of a flat cream fill.
function hasFaceCardArt(rank: Rank): boolean {
  return COURT_RANKS.has(rank) || rank === 14;
}

export type CardFace = "fan" | "table";

export type FaceCardStyle = "basico" | "artdeco" | "retrato" | "grafico" | "folclor";

/** In display order for a settings picker — see SettingsScreen.tsx's own face-card-style section,
 * the same pattern CardBack.tsx's `CARD_BACK_STYLES` already established. "basico" first — the
 * plain code-drawn rendering this app always had, kept as an option for a player who'd rather
 * have less visual noise than any of the 4 illustrated decks (Francisco's explicit request). */
export const FACE_CARD_STYLES: FaceCardStyle[] = ["basico", "artdeco", "retrato", "grafico", "folclor"];

/** First-run default for a player who's never opened Settings — chosen for legibility at this
 * component's actual on-screen size (`face="table"` is 72x104px), not just how the art reads
 * enlarged: Art Decó Imperial's bold, high-contrast linework holds up best that small among the
 * four styles (see this feature's own readability pass, .claude/skills/king-ui-modernization). */
export const DEFAULT_FACE_CARD_STYLE: FaceCardStyle = "artdeco";

// Which illustrated-art filename key a card maps to — J/Q/K/A regardless of locale (these are
// asset filenames, not player-facing text; the actual displayed corner index stays fully
// locale-aware via RANK_LABEL_KEY/rankLabel above, completely independent of this).
const FACE_RANK_KEY: Partial<Record<Rank, "J" | "Q" | "K" | "A">> = {
  11: "J",
  12: "Q",
  13: "K",
  14: "A",
};

function faceCardKey(card: Card): string {
  return `${card.suit}${FACE_RANK_KEY[card.rank]}`;
}

function isIllustrated(style: FaceCardStyle): style is IllustratedFaceCardStyle {
  return style !== "basico";
}

// The finished face-card/number-background art lives under apps/mobile/assets (not inside this
// package), same cross-package-boundary reasoning as CardBack.tsx's own CARD_BACK_IMAGES doc
// comment: apps/mobile is (today) this package's only consumer, so a plain relative require()
// reaching across is simpler than duplicating the files into ui-kit's own assets.
// "basico" has no art of its own (see the render logic below, gated on `showArt`) — these maps
// only ever get indexed by the 4 illustrated styles, so `Exclude` keeps that structurally true
// instead of forcing a meaningless "basico" entry just to satisfy a plain `Record<FaceCardStyle,...>`.
type IllustratedFaceCardStyle = Exclude<FaceCardStyle, "basico">;

const FACE_CARD_IMAGES: Record<IllustratedFaceCardStyle, Record<string, ImageSourcePropType>> = {
  artdeco: {
    SK: require("../../../../apps/mobile/assets/facecards/artdeco/SK.jpg"),
    SQ: require("../../../../apps/mobile/assets/facecards/artdeco/SQ.jpg"),
    SJ: require("../../../../apps/mobile/assets/facecards/artdeco/SJ.jpg"),
    SA: require("../../../../apps/mobile/assets/facecards/artdeco/SA.jpg"),
    HK: require("../../../../apps/mobile/assets/facecards/artdeco/HK.jpg"),
    HQ: require("../../../../apps/mobile/assets/facecards/artdeco/HQ.jpg"),
    HJ: require("../../../../apps/mobile/assets/facecards/artdeco/HJ.jpg"),
    HA: require("../../../../apps/mobile/assets/facecards/artdeco/HA.jpg"),
    DK: require("../../../../apps/mobile/assets/facecards/artdeco/DK.jpg"),
    DQ: require("../../../../apps/mobile/assets/facecards/artdeco/DQ.jpg"),
    DJ: require("../../../../apps/mobile/assets/facecards/artdeco/DJ.jpg"),
    DA: require("../../../../apps/mobile/assets/facecards/artdeco/DA.jpg"),
    CK: require("../../../../apps/mobile/assets/facecards/artdeco/CK.jpg"),
    CQ: require("../../../../apps/mobile/assets/facecards/artdeco/CQ.jpg"),
    CJ: require("../../../../apps/mobile/assets/facecards/artdeco/CJ.jpg"),
    CA: require("../../../../apps/mobile/assets/facecards/artdeco/CA.jpg"),
  },
  retrato: {
    SK: require("../../../../apps/mobile/assets/facecards/retrato/SK.jpg"),
    SQ: require("../../../../apps/mobile/assets/facecards/retrato/SQ.jpg"),
    SJ: require("../../../../apps/mobile/assets/facecards/retrato/SJ.jpg"),
    SA: require("../../../../apps/mobile/assets/facecards/retrato/SA.jpg"),
    HK: require("../../../../apps/mobile/assets/facecards/retrato/HK.jpg"),
    HQ: require("../../../../apps/mobile/assets/facecards/retrato/HQ.jpg"),
    HJ: require("../../../../apps/mobile/assets/facecards/retrato/HJ.jpg"),
    HA: require("../../../../apps/mobile/assets/facecards/retrato/HA.jpg"),
    DK: require("../../../../apps/mobile/assets/facecards/retrato/DK.jpg"),
    DQ: require("../../../../apps/mobile/assets/facecards/retrato/DQ.jpg"),
    DJ: require("../../../../apps/mobile/assets/facecards/retrato/DJ.jpg"),
    DA: require("../../../../apps/mobile/assets/facecards/retrato/DA.jpg"),
    CK: require("../../../../apps/mobile/assets/facecards/retrato/CK.jpg"),
    CQ: require("../../../../apps/mobile/assets/facecards/retrato/CQ.jpg"),
    CJ: require("../../../../apps/mobile/assets/facecards/retrato/CJ.jpg"),
    CA: require("../../../../apps/mobile/assets/facecards/retrato/CA.jpg"),
  },
  grafico: {
    SK: require("../../../../apps/mobile/assets/facecards/grafico/SK.jpg"),
    SQ: require("../../../../apps/mobile/assets/facecards/grafico/SQ.jpg"),
    SJ: require("../../../../apps/mobile/assets/facecards/grafico/SJ.jpg"),
    SA: require("../../../../apps/mobile/assets/facecards/grafico/SA.jpg"),
    HK: require("../../../../apps/mobile/assets/facecards/grafico/HK.jpg"),
    HQ: require("../../../../apps/mobile/assets/facecards/grafico/HQ.jpg"),
    HJ: require("../../../../apps/mobile/assets/facecards/grafico/HJ.jpg"),
    HA: require("../../../../apps/mobile/assets/facecards/grafico/HA.jpg"),
    DK: require("../../../../apps/mobile/assets/facecards/grafico/DK.jpg"),
    DQ: require("../../../../apps/mobile/assets/facecards/grafico/DQ.jpg"),
    DJ: require("../../../../apps/mobile/assets/facecards/grafico/DJ.jpg"),
    DA: require("../../../../apps/mobile/assets/facecards/grafico/DA.jpg"),
    CK: require("../../../../apps/mobile/assets/facecards/grafico/CK.jpg"),
    CQ: require("../../../../apps/mobile/assets/facecards/grafico/CQ.jpg"),
    CJ: require("../../../../apps/mobile/assets/facecards/grafico/CJ.jpg"),
    CA: require("../../../../apps/mobile/assets/facecards/grafico/CA.jpg"),
  },
  folclor: {
    SK: require("../../../../apps/mobile/assets/facecards/folclor/SK.jpg"),
    SQ: require("../../../../apps/mobile/assets/facecards/folclor/SQ.jpg"),
    SJ: require("../../../../apps/mobile/assets/facecards/folclor/SJ.jpg"),
    SA: require("../../../../apps/mobile/assets/facecards/folclor/SA.jpg"),
    HK: require("../../../../apps/mobile/assets/facecards/folclor/HK.jpg"),
    HQ: require("../../../../apps/mobile/assets/facecards/folclor/HQ.jpg"),
    HJ: require("../../../../apps/mobile/assets/facecards/folclor/HJ.jpg"),
    HA: require("../../../../apps/mobile/assets/facecards/folclor/HA.jpg"),
    DK: require("../../../../apps/mobile/assets/facecards/folclor/DK.jpg"),
    DQ: require("../../../../apps/mobile/assets/facecards/folclor/DQ.jpg"),
    DJ: require("../../../../apps/mobile/assets/facecards/folclor/DJ.jpg"),
    DA: require("../../../../apps/mobile/assets/facecards/folclor/DA.jpg"),
    CK: require("../../../../apps/mobile/assets/facecards/folclor/CK.jpg"),
    CQ: require("../../../../apps/mobile/assets/facecards/folclor/CQ.jpg"),
    CJ: require("../../../../apps/mobile/assets/facecards/folclor/CJ.jpg"),
    CA: require("../../../../apps/mobile/assets/facecards/folclor/CA.jpg"),
  },
};

const NUMBER_BG_IMAGES: Record<IllustratedFaceCardStyle, ImageSourcePropType> = {
  artdeco: require("../../../../apps/mobile/assets/facecards/artdeco/numberBg.jpg"),
  retrato: require("../../../../apps/mobile/assets/facecards/retrato/numberBg.jpg"),
  grafico: require("../../../../apps/mobile/assets/facecards/grafico/numberBg.jpg"),
  folclor: require("../../../../apps/mobile/assets/facecards/folclor/numberBg.jpg"),
};

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

function suitColor(suit: Card["suit"]): string {
  return RED_SUITS.has(suit) ? colors.heart : colors.ink;
}

export interface PlayingCardProps {
  card: Card;
  /** `fan` = readable corner index only (hand). `table` = full pips (trick). */
  face?: CardFace;
  /** Which illustrated deck to draw King/Queen/Jack/Ace art (and the number cards' shared
   * background) from — see FACE_CARD_STYLES above. No default: every caller reaches this from
   * Settings (`useSettings()`), so it's always an explicit, deliberate value, not a silent
   * fallback a caller forgot to wire up — the same reasoning `CornerIndex`'s locale-aware label
   * already gets via `useTranslation()`, just threaded as a prop instead since this isn't i18n.
   * Unused when `face === "fan"` (the hand's own overlapping fan only ever shows the corner
   * index), but still required there too — see Hand.tsx's own `faceCardStyle` prop for why. */
  faceCardStyle: FaceCardStyle;
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
  faceCardStyle,
  onPress,
  disabled = false,
  highlighted = false,
  style,
  scale = 1,
}: PlayingCardProps) {
  const { t } = useTranslation();
  const color = suitColor(card.suit);
  const interactive = onPress !== undefined && !disabled;
  const isKingHearts = card.rank === 13 && card.suit === "H";
  const isAceHearts = card.rank === 14 && card.suit === "H";
  const dim = DIM[face];
  const label = rankLabel(card.rank, t);
  const illustrated = isIllustrated(faceCardStyle);
  const isFaceCardRank = hasFaceCardArt(card.rank);
  // `face="table"`'s center content: illustrated styles only ever need to add NumberPips on top
  // of the background Image above (the image itself already *is* the King/Queen/Jack/Ace face);
  // "basico" has no background art at all, so it draws everything itself, exactly as this app
  // did before any illustrated deck existed.
  let centerContent = null;
  if (illustrated) {
    if (!isFaceCardRank) centerContent = <NumberPips rank={card.rank} suit={card.suit} color={color} />;
  } else if (isFaceCardRank) {
    centerContent = COURT_RANKS.has(card.rank) ? (
      <CourtFace label={label} suit={card.suit} color={color} special={isKingHearts} />
    ) : (
      <AcePip suit={card.suit} color={color} special={isAceHearts} />
    );
  } else {
    centerContent = <NumberPips rank={card.rank} suit={card.suit} color={color} />;
  }

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
        {/* Table only, not the fan hand — tried showing this art behind `face="fan"` too (a
         * direct request), but a 48px-wide fan card is typically 60-80% covered by its neighbor
         * (see Hand.tsx's overlap math), so what actually stays visible per card is a narrow,
         * essentially random vertical sliver of the full illustration — reads as a meaningless
         * fragment (a stray piece of an ornate frame, a sword, a snake-like flourish), not the
         * card. Confirmed live: every one of the 4 illustrated styles looked broken this way, not
         * just one or two cards, so this isn't a fixable per-image crop — the same problem would
         * recur for any sufficiently detailed art shown at this width/overlap. Reverted; the
         * fan's own single large corner index (below) is still real information either way. */}
        {illustrated && face === "table" && (
          <Image
            source={isFaceCardRank ? FACE_CARD_IMAGES[faceCardStyle][faceCardKey(card)] : NUMBER_BG_IMAGES[faceCardStyle]}
            style={[styles.faceArt, { width: dim.width, height: dim.height }]}
            resizeMode="cover"
          />
        )}
        <CornerIndex label={label} suit={card.suit} color={color} large={face === "fan"} />
        {face === "table" && (
          <>
            {centerContent}
            <CornerIndex label={label} suit={card.suit} color={color} inverted />
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

// Only reachable for `faceCardStyle === "basico"` (see `isIllustrated`) — the plain code-drawn
// rendering this app used before any illustrated deck existed, kept as the deliberately
// lower-visual-noise option (Francisco's explicit request: "por si alguien no quiere tanto ruido
// en su juego").
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
  // The opaque cream backing (not just the fixed `card` background showing through) is what
  // keeps this readable regardless of what's directly underneath — an illustrated style's own
  // background art, whether a number card's decorative frame or a face card's own baked-in
  // corner index, extends right up to the corner exactly where this needs to sit. A plain patch
  // here reads as "the index always has a clean spot," the same convention the reference card
  // Francisco pointed to already uses (ornament confined to the corners the index doesn't touch).
  // Harmless no-op for "basico" — same solid color as its own already-plain `card` background.
  corner: {
    position: "absolute",
    alignItems: "center",
    width: 20,
    zIndex: 2,
    backgroundColor: colors.cream,
    borderRadius: radii.sm,
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
  // "basico" only (see AcePip/CourtFace above).
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
  // Illustrated face-card art (King/Queen/Jack/Ace) or the number cards' shared background —
  // either way, a full-bleed layer behind both corner indices, sized to the exact same
  // width/height as `card` itself (explicit, not `flex`/absoluteFillObject — see CardBack.tsx's
  // own doc comment on why an Image needs real pixel dimensions here, not shrink-to-fit sizing).
  // `card`'s own `overflow: "hidden"` clips this to the card's rounded corners; `borderRadius`
  // here too is the same belt-and-suspenders CardBack.tsx's own image style already uses.
  faceArt: {
    position: "absolute",
    top: 0,
    left: 0,
    borderRadius: radii.card,
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
