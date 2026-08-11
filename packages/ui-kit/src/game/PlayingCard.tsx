import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Card, Rank } from "rules-engine";

export const SUIT_SYMBOLS: Record<Card["suit"], string> = { S: "♠", H: "♥", D: "♦", C: "♣" };
const RED_SUITS = new Set<Card["suit"]>(["H", "D"]);
const RANK_LABELS: Partial<Record<Rank, string>> = { 11: "J", 12: "Q", 13: "K", 14: "A" };

function rankLabel(rank: Rank): string {
  return RANK_LABELS[rank] ?? String(rank);
}

export const CARD_WIDTH = 52;
export const CARD_HEIGHT = 72;

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
 * A single face-up playing card. Rank/suit sit in the top-left corner, like a real card's index,
 * rather than centered — so the identifier stays fully readable even when most of the card is
 * covered by an overlapping neighbor in a fanned hand (a centered index disappears entirely under
 * overlap; a corner index doesn't). A disabled (currently unplayable) card gets a translucent
 * shadow over it — not full opacity — so it still reads clearly while looking clearly unusable.
 * No game logic — purely `card` in, a press callback out.
 */
export function PlayingCard({ card, onPress, disabled = false, highlighted = false }: PlayingCardProps) {
  const isRed = RED_SUITS.has(card.suit);
  const interactive = onPress !== undefined && !disabled;
  const color = isRed ? styles.red : styles.black;

  return (
    <Pressable
      onPress={interactive ? onPress : undefined}
      disabled={!interactive}
      style={[styles.card, highlighted && styles.cardHighlighted]}
    >
      <View style={styles.corner}>
        <Text style={[styles.rank, color]}>{rankLabel(card.rank)}</Text>
        <Text style={[styles.suit, color]}>{SUIT_SYMBOLS[card.suit]}</Text>
      </View>
      {disabled && <View style={styles.shadow} pointerEvents="none" />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 6,
    backgroundColor: "#f5e6c8",
    borderWidth: 1,
    borderColor: "#0b3d2e",
  },
  cardHighlighted: {
    borderColor: "#f2c14e",
    borderWidth: 3,
  },
  corner: {
    position: "absolute",
    top: 4,
    left: 5,
    alignItems: "center",
  },
  rank: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 16,
  },
  suit: {
    fontSize: 13,
    lineHeight: 14,
  },
  shadow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 6,
    backgroundColor: "rgba(11, 30, 23, 0.42)",
  },
  red: {
    color: "#a8322d",
  },
  black: {
    color: "#1a1a1a",
  },
});
