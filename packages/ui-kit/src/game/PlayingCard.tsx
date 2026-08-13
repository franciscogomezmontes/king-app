import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Card, Rank } from "rules-engine";
import { colors, fonts, radii } from "../theme";

export const SUIT_SYMBOLS: Record<Card["suit"], string> = { S: "♠", H: "♥", D: "♦", C: "♣" };
const RED_SUITS = new Set<Card["suit"]>(["H", "D"]);
const RANK_LABELS: Partial<Record<Rank, string>> = { 11: "J", 12: "Q", 13: "K", 14: "A" };
const COURT_RANKS = new Set<Rank>([11, 12, 13]);

function rankLabel(rank: Rank): string {
  return RANK_LABELS[rank] ?? String(rank);
}

function suitColor(suit: Card["suit"]): string {
  return RED_SUITS.has(suit) ? colors.heart : colors.ink;
}

// 60×88 keeps a 13-card fan under a 360px phone: 60 + 12×22 = 324.
export const CARD_WIDTH = 60;
export const CARD_HEIGHT = 88;

export interface PlayingCardProps {
  card: Card;
  /** Omit to render a non-interactive card — e.g. a card sitting on the table. */
  onPress?: () => void;
  disabled?: boolean;
  /** Draws an attention border — used for the currently-legal cards in the human's hand. */
  highlighted?: boolean;
}

/**
 * A face-up playing card. Corner indices stay in the top-left sliver of a fan.
 * Number pips live in a padded well so they never collide with those indices.
 * No rotated pip glyphs — RN-web double-paints 180° Text and made 7s/9s/10s look broken.
 */
export function PlayingCard({ card, onPress, disabled = false, highlighted = false }: PlayingCardProps) {
  const color = suitColor(card.suit);
  const interactive = onPress !== undefined && !disabled;
  const isAceHearts = card.rank === 14 && card.suit === "H";
  const isKingHearts = card.rank === 13 && card.suit === "H";

  return (
    <Pressable
      onPress={interactive ? onPress : undefined}
      disabled={!interactive}
      style={[styles.card, highlighted && styles.cardHighlighted, isKingHearts && styles.cardKingHearts]}
    >
      <CornerIndex rank={card.rank} suit={card.suit} color={color} />
      <CornerIndex rank={card.rank} suit={card.suit} color={color} inverted />
      {COURT_RANKS.has(card.rank) ? (
        <CourtFace rank={card.rank} suit={card.suit} color={color} special={isKingHearts} />
      ) : card.rank === 14 ? (
        <AcePip suit={card.suit} color={color} special={isAceHearts} />
      ) : (
        <NumberPips rank={card.rank} suit={card.suit} color={color} />
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
}: {
  rank: Rank;
  suit: Card["suit"];
  color: string;
  inverted?: boolean;
}) {
  const ten = rank === 10;
  return (
    <View style={[styles.corner, inverted ? styles.cornerInverted : styles.cornerTop]}>
      <Text style={[styles.rank, ten && styles.rankTen, { color }]}>{rankLabel(rank)}</Text>
      <Text style={[styles.suit, { color }]}>{SUIT_SYMBOLS[suit]}</Text>
    </View>
  );
}

function Pip({ suit, color }: { suit: Card["suit"]; color: string }) {
  return <Text style={[styles.pip, { color }]}>{SUIT_SYMBOLS[suit]}</Text>;
}

function PipRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.pipRow}>{children}</View>;
}

function PipCenter({ children }: { children: React.ReactNode }) {
  return <View style={styles.pipCenter}>{children}</View>;
}

function NumberPips({ rank, suit, color }: { rank: Rank; suit: Card["suit"]; color: string }) {
  const pip = <Pip suit={suit} color={color} />;
  const lr = (
    <PipRow>
      {pip}
      {pip}
    </PipRow>
  );
  const mid = <PipCenter>{pip}</PipCenter>;

  let rows: React.ReactNode;
  switch (rank) {
    case 2:
      rows = (
        <>
          {mid}
          {mid}
        </>
      );
      break;
    case 3:
      rows = (
        <>
          {mid}
          {mid}
          {mid}
        </>
      );
      break;
    case 4:
      rows = (
        <>
          {lr}
          {lr}
        </>
      );
      break;
    case 5:
      rows = (
        <>
          {lr}
          {mid}
          {lr}
        </>
      );
      break;
    case 6:
      rows = (
        <>
          {lr}
          {lr}
          {lr}
        </>
      );
      break;
    case 7:
      rows = (
        <>
          {lr}
          {mid}
          {lr}
          {lr}
        </>
      );
      break;
    case 8:
      rows = (
        <>
          {lr}
          {mid}
          {lr}
          {mid}
          {lr}
        </>
      );
      break;
    case 9:
      rows = (
        <>
          {lr}
          {lr}
          {mid}
          {lr}
          {lr}
        </>
      );
      break;
    case 10:
      rows = (
        <>
          {lr}
          {mid}
          {lr}
          {lr}
          {mid}
          {lr}
        </>
      );
      break;
    default:
      rows = null;
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
      <Text style={[styles.acePip, { color, fontSize: special ? 30 : 26 }]}>{SUIT_SYMBOLS[suit]}</Text>
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
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
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
    fontSize: 12,
    lineHeight: 13,
    includeFontPadding: false,
  },
  rankTen: {
    fontSize: 10,
    lineHeight: 11,
    letterSpacing: -0.6,
  },
  suit: {
    fontSize: 10,
    lineHeight: 11,
    marginTop: 0,
    includeFontPadding: false,
  },
  pipWell: {
    position: "absolute",
    top: 16,
    bottom: 16,
    left: 14,
    right: 14,
    justifyContent: "space-between",
  },
  pipRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 12,
  },
  pipCenter: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    height: 12,
  },
  pip: {
    width: 12,
    fontSize: 11,
    lineHeight: 12,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.gold,
  },
  acePip: {
    fontSize: 26,
    lineHeight: 30,
    includeFontPadding: false,
  },
  courtWell: {
    position: "absolute",
    top: 18,
    bottom: 18,
    left: 16,
    right: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  courtRank: {
    fontFamily: fonts.display,
    fontSize: 28,
    lineHeight: 30,
    includeFontPadding: false,
  },
  courtSuit: {
    fontSize: 16,
    lineHeight: 18,
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
