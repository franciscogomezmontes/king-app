import { Pressable, StyleSheet, Text } from "react-native";
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
  /** Omit to render a non-interactive card — e.g. an opponent's played card on the table. */
  onPress?: () => void;
  disabled?: boolean;
  /** Draws an attention border — used for the currently-legal cards in the human's hand, so
   * "what can I play" reads as a positive highlight rather than dimming everything else out. */
  highlighted?: boolean;
}

/** A single face-up playing card. No game logic — purely `card` in, a press callback out. */
export function PlayingCard({ card, onPress, disabled = false, highlighted = false }: PlayingCardProps) {
  const isRed = RED_SUITS.has(card.suit);
  const interactive = onPress !== undefined && !disabled;

  return (
    <Pressable
      onPress={interactive ? onPress : undefined}
      disabled={!interactive}
      style={[styles.card, highlighted && styles.cardHighlighted]}
    >
      <Text style={[styles.rank, isRed ? styles.red : styles.black]}>{rankLabel(card.rank)}</Text>
      <Text style={[styles.suit, isRed ? styles.red : styles.black]}>{SUIT_SYMBOLS[card.suit]}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 6,
    backgroundColor: "#f5e6c8",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#0b3d2e",
  },
  cardHighlighted: {
    borderColor: "#f2c14e",
    borderWidth: 3,
  },
  rank: {
    fontSize: 18,
    fontWeight: "700",
  },
  suit: {
    fontSize: 20,
  },
  red: {
    color: "#a8322d",
  },
  black: {
    color: "#1a1a1a",
  },
});
