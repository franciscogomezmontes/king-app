import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Card, Rank } from "rules-engine";
import { colors, fonts, radii } from "../theme";

export const SUIT_SYMBOLS: Record<Card["suit"], string> = { S: "♠", H: "♥", D: "♦", C: "♣" };
const RED_SUITS = new Set<Card["suit"]>(["H", "D"]);
const RANK_LABELS: Partial<Record<Rank, string>> = { 11: "J", 12: "Q", 13: "K", 14: "A" };

function rankLabel(rank: Rank): string {
  return RANK_LABELS[rank] ?? String(rank);
}

function suitColor(suit: Card["suit"]): string {
  return RED_SUITS.has(suit) ? colors.heart : colors.ink;
}

// Slightly larger than the old 52×72 prototype. A 13-card fan with MIN_VISIBLE_SLIVER=24
// is 56 + 12×24 = 344px, which still fits a ~360px phone without horizontal scroll.
export const CARD_WIDTH = 56;
export const CARD_HEIGHT = 78;

const PIP_SIZE = 11;
const COURT_RANKS = new Set<Rank>([11, 12, 13]);

interface PipSpec {
  x: number;
  y: number;
  flip?: boolean;
}

function pipLayout(rank: Rank): PipSpec[] {
  const L = 0.28;
  const R = 0.72;
  const C = 0.5;
  switch (rank) {
    case 2:
      return [
        { x: C, y: 0.22 },
        { x: C, y: 0.78, flip: true },
      ];
    case 3:
      return [{ x: C, y: 0.2 }, { x: C, y: 0.5 }, { x: C, y: 0.8, flip: true }];
    case 4:
      return [
        { x: L, y: 0.22 },
        { x: R, y: 0.22 },
        { x: L, y: 0.78, flip: true },
        { x: R, y: 0.78, flip: true },
      ];
    case 5:
      return [...pipLayout(4), { x: C, y: 0.5 }];
    case 6:
      return [
        { x: L, y: 0.22 },
        { x: R, y: 0.22 },
        { x: L, y: 0.5 },
        { x: R, y: 0.5 },
        { x: L, y: 0.78, flip: true },
        { x: R, y: 0.78, flip: true },
      ];
    case 7:
      return [...pipLayout(6), { x: C, y: 0.36 }];
    case 8:
      return [...pipLayout(6), { x: C, y: 0.36 }, { x: C, y: 0.64, flip: true }];
    case 9:
      return [
        { x: L, y: 0.18 },
        { x: R, y: 0.18 },
        { x: L, y: 0.38 },
        { x: R, y: 0.38 },
        { x: C, y: 0.5 },
        { x: L, y: 0.62, flip: true },
        { x: R, y: 0.62, flip: true },
        { x: L, y: 0.82, flip: true },
        { x: R, y: 0.82, flip: true },
      ];
    case 10:
      return [
        { x: L, y: 0.16 },
        { x: R, y: 0.16 },
        { x: L, y: 0.34 },
        { x: R, y: 0.34 },
        { x: C, y: 0.26 },
        { x: C, y: 0.74, flip: true },
        { x: L, y: 0.66, flip: true },
        { x: R, y: 0.66, flip: true },
        { x: L, y: 0.84, flip: true },
        { x: R, y: 0.84, flip: true },
      ];
    default:
      return [];
  }
}

export interface PlayingCardProps {
  card: Card;
  /** Omit to render a non-interactive card — e.g. a card sitting on the table. */
  onPress?: () => void;
  disabled?: boolean;
  /** Draws an attention border — used for the currently-legal cards in the human's hand, so
   * "what can I play" reads as a positive highlight rather than dimming everything else out. */
  highlighted?: boolean;
}

/**
 * A face-up playing card: top-left (and inverted bottom-right) corner indices so a fanned hand
 * still shows rank+suit in the visible sliver, plus center pips on number cards. Court cards
 * get a large rank+suit face. Ace of hearts and King of hearts are slightly special — K♥ is
 * the club's signature.
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
        pipLayout(card.rank).map((pip, i) => (
          <Text
            key={i}
            style={[
              styles.pip,
              {
                color,
                left: pip.x * CARD_WIDTH - PIP_SIZE / 2,
                top: pip.y * CARD_HEIGHT - PIP_SIZE / 2,
                transform: pip.flip ? [{ rotate: "180deg" }] : undefined,
              },
            ]}
          >
            {SUIT_SYMBOLS[card.suit]}
          </Text>
        ))
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
  return (
    <View style={[styles.corner, inverted ? styles.cornerInverted : styles.cornerTop]}>
      <Text style={[styles.rank, { color }]}>{rankLabel(rank)}</Text>
      <Text style={[styles.suit, { color }]}>{SUIT_SYMBOLS[suit]}</Text>
    </View>
  );
}

function AcePip({ suit, color, special }: { suit: Card["suit"]; color: string; special: boolean }) {
  return (
    <View style={styles.aceCenter} pointerEvents="none">
      {special && <View style={styles.aceRing} />}
      <Text style={[styles.acePip, { color, fontSize: special ? 28 : 24 }]}>{SUIT_SYMBOLS[suit]}</Text>
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
    <View style={[styles.face, special && styles.faceSpecial]} pointerEvents="none">
      <Text style={[styles.faceRank, { color: special ? colors.gold : color }]}>{rankLabel(rank)}</Text>
      <Text style={[styles.faceSuit, { color }]}>{SUIT_SYMBOLS[suit]}</Text>
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
    borderWidth: 3,
  },
  cardKingHearts: {
    borderColor: colors.gold,
  },
  corner: {
    position: "absolute",
    alignItems: "center",
    width: 16,
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
    fontSize: 13,
    lineHeight: 14,
    fontWeight: "700",
  },
  suit: {
    fontSize: 11,
    lineHeight: 12,
    marginTop: -1,
  },
  pip: {
    position: "absolute",
    width: PIP_SIZE,
    fontSize: PIP_SIZE,
    lineHeight: PIP_SIZE + 1,
    textAlign: "center",
  },
  aceCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  aceRing: {
    position: "absolute",
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: colors.gold,
  },
  acePip: {
    fontSize: 24,
    lineHeight: 28,
  },
  face: {
    position: "absolute",
    top: 18,
    left: 10,
    right: 10,
    bottom: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(26, 26, 26, 0.12)",
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.28)",
  },
  faceSpecial: {
    borderColor: colors.gold,
    backgroundColor: "rgba(242, 193, 78, 0.12)",
  },
  faceRank: {
    fontFamily: fonts.display,
    fontSize: 22,
    lineHeight: 24,
    fontWeight: "700",
  },
  faceSuit: {
    fontSize: 16,
    lineHeight: 18,
    marginTop: 1,
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
