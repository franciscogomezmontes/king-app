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
  /** Omit (or pass disabled) to render a non-interactive card — e.g. in the trick area. */
  onPress?: () => void;
  disabled?: boolean;
}

/** A single face-up playing card. No game logic — purely `card` in, a press callback out. */
export function PlayingCard({ card, onPress, disabled = false }: PlayingCardProps) {
  const isRed = RED_SUITS.has(card.suit);
  const interactive = onPress !== undefined && !disabled;

  return (
    <Pressable
      onPress={interactive ? onPress : undefined}
      disabled={!interactive}
      style={[styles.card, disabled && styles.cardDisabled]}
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
  cardDisabled: {
    opacity: 0.4,
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
