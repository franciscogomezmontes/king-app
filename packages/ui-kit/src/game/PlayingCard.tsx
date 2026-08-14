import { type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Card, Rank } from "rules-engine";
import { colors, fonts, radii } from "../theme";

export const SUIT_SYMBOLS: Record<Card["suit"], string> = { S: "♠", H: "♥", D: "♦", C: "♣" };
const RED_SUITS = new Set<Card["suit"]>(["H", "D"]);
const RANK_LABELS: Partial<Record<Rank, string>> = { 11: "J", 12: "Q", 13: "K", 14: "A" };
const COURT_RANKS = new Set<Rank>([11, 12, 13]);

export type CardFace = "fan" | "table";

const DIM = {
  fan: { width: 42, height: 64 },
  table: { width: 64, height: 92 },
} as const;

/** Table-face size — used by trick slots and card backs. */
export const CARD_WIDTH = DIM.table.width;
export const CARD_HEIGHT = DIM.table.height;
/** Fan size — used by the overlapping hand. */
export const FAN_CARD_WIDTH = DIM.fan.width;
export const FAN_CARD_HEIGHT = DIM.fan.height;

function rankLabel(rank: Rank): string {
  return RANK_LABELS[rank] ?? String(rank);
}

function suitColor(suit: Card["suit"]): string {
  return RED_SUITS.has(suit) ? colors.heart : colors.ink;
}

export interface PlayingCardProps {
  card: Card;
  /** `fan` = readable corner index only (hand). `table` = full pips (trick). */
  face?: CardFace;
  onPress?: () => void;
  disabled?: boolean;
  highlighted?: boolean;
}

/**
 * Face-up card. In a fanned hand the overlapping neighbor hides most of the card, so `face="fan"`
 * draws only a large top-left index — the way a real fan is read. `face="table"` draws the full
 * pip layout in a padded well that does not collide with the corners.
 */
export function PlayingCard({
  card,
  face = "table",
  onPress,
  disabled = false,
  highlighted = false,
}: PlayingCardProps) {
  const color = suitColor(card.suit);
  const interactive = onPress !== undefined && !disabled;
  const isAceHearts = card.rank === 14 && card.suit === "H";
  const isKingHearts = card.rank === 13 && card.suit === "H";
  const dim = DIM[face];

  return (
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
      <CornerIndex rank={card.rank} suit={card.suit} color={color} large={face === "fan"} />
      {face === "table" && (
        <>
          <CornerIndex rank={card.rank} suit={card.suit} color={color} inverted />
          {COURT_RANKS.has(card.rank) ? (
            <CourtFace rank={card.rank} suit={card.suit} color={color} special={isKingHearts} />
          ) : card.rank === 14 ? (
            <AcePip suit={card.suit} color={color} special={isAceHearts} />
          ) : (
            <NumberPips rank={card.rank} suit={card.suit} color={color} />
          )}
        </>
      )}
      {disabled && <View style={styles.shadow} pointerEvents="none" />}
    </Pressable>
  );
}

function CornerIndex({
  rank,
  suit,
  color,
  inverted = false,
  large = false,
}: {
  rank: Rank;
  suit: Card["suit"];
  color: string;
  inverted?: boolean;
  large?: boolean;
}) {
  const ten = rank === 10;
  return (
    <View style={[styles.corner, inverted ? styles.cornerInverted : styles.cornerTop, large && styles.cornerLarge]}>
      <Text style={[large ? styles.rankFan : styles.rank, ten && !large && styles.rankTen, { color }]}>
        {rankLabel(rank)}
      </Text>
      <Text style={[large ? styles.suitFan : styles.suit, { color }]}>{SUIT_SYMBOLS[suit]}</Text>
    </View>
  );
}

function Pip({ suit, color }: { suit: Card["suit"]; color: string }) {
  return <Text style={[styles.pip, { color }]}>{SUIT_SYMBOLS[suit]}</Text>;
}

function PipRow({ children }: { children: ReactNode }) {
  return <View style={styles.pipRow}>{children}</View>;
}

function PipCenter({ children }: { children: ReactNode }) {
  return <View style={styles.pipCenter}>{children}</View>;
}

function NumberPips({ rank, suit, color }: { rank: Rank; suit: Card["suit"]; color: string }) {
  const p = () => <Pip suit={suit} color={color} />;
  const lr = (key: string) => (
    <PipRow key={key}>
      {p()}
      {p()}
    </PipRow>
  );
  const mid = (key: string) => <PipCenter key={key}>{p()}</PipCenter>;

  let rows: ReactNode = null;
  switch (rank) {
    case 2:
      rows = (
        <>
          {mid("t")}
          {mid("b")}
        </>
      );
      break;
    case 3:
      rows = (
        <>
          {mid("t")}
          {mid("m")}
          {mid("b")}
        </>
      );
      break;
    case 4:
      rows = (
        <>
          {lr("t")}
          {lr("b")}
        </>
      );
      break;
    case 5:
      rows = (
        <>
          {lr("t")}
          {mid("m")}
          {lr("b")}
        </>
      );
      break;
    case 6:
      rows = (
        <>
          {lr("t")}
          {lr("m")}
          {lr("b")}
        </>
      );
      break;
    case 7:
      rows = (
        <>
          {lr("t")}
          {mid("u")}
          {lr("m")}
          {lr("b")}
        </>
      );
      break;
    case 8:
      rows = (
        <>
          {lr("t")}
          {mid("u")}
          {lr("m")}
          {mid("d")}
          {lr("b")}
        </>
      );
      break;
    case 9:
      rows = (
        <>
          {lr("1")}
          {lr("2")}
          {mid("m")}
          {lr("3")}
          {lr("4")}
        </>
      );
      break;
    case 10:
      rows = (
        <>
          {lr("1")}
          {mid("u")}
          {lr("2")}
          {lr("3")}
          {mid("d")}
          {lr("4")}
        </>
      );
      break;
  }

  return (
    <View style={styles.pipWell} pointerEvents="none">
      {rows}
    </View>
  );
}

function AcePip({ suit, color, special }: { suit: Card["suit"]; color: string; special: boolean }) {
  return (
    <View style={styles.aceCenter} pointerEvents="none">
      {special && <View style={styles.aceRing} />}
      <Text style={[styles.acePip, { color, fontSize: special ? 34 : 30 }]}>{SUIT_SYMBOLS[suit]}</Text>
    </View>
  );
}

function CourtFace({
  rank,
  suit,
  color,
  special,
}: {
  rank: Rank;
  suit: Card["suit"];
  color: string;
  special: boolean;
}) {
  return (
    <View style={styles.courtWell} pointerEvents="none">
      <Text style={[styles.courtRank, { color: special ? colors.gold : color }]}>{rankLabel(rank)}</Text>
      <Text style={[styles.courtSuit, { color }]}>{SUIT_SYMBOLS[suit]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
    width: 18,
    zIndex: 2,
  },
  cornerLarge: {
    width: 24,
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
    fontSize: 13,
    lineHeight: 14,
    includeFontPadding: false,
  },
  rankFan: {
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    lineHeight: 20,
    includeFontPadding: false,
  },
  rankTen: {
    fontSize: 11,
    lineHeight: 12,
    letterSpacing: -0.6,
  },
  suit: {
    fontSize: 11,
    lineHeight: 12,
    includeFontPadding: false,
  },
  suitFan: {
    fontSize: 15,
    lineHeight: 16,
    includeFontPadding: false,
  },
  pipWell: {
    position: "absolute",
    top: 18,
    bottom: 18,
    left: 16,
    right: 16,
    justifyContent: "space-between",
  },
  pipRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 13,
  },
  pipCenter: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    height: 13,
  },
  pip: {
    width: 14,
    fontSize: 13,
    lineHeight: 14,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.gold,
  },
  acePip: {
    fontSize: 30,
    lineHeight: 34,
    includeFontPadding: false,
  },
  courtWell: {
    position: "absolute",
    top: 20,
    bottom: 20,
    left: 18,
    right: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  courtRank: {
    fontFamily: fonts.display,
    fontSize: 32,
    lineHeight: 34,
    includeFontPadding: false,
  },
  courtSuit: {
    fontSize: 18,
    lineHeight: 20,
    marginTop: 2,
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
