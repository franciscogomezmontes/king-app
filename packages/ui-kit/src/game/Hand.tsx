import { StyleSheet, View } from "react-native";
import type { Card } from "rules-engine";
import { FAN_CARD_WIDTH, PlayingCard } from "./PlayingCard";

function sameCard(a: Card, b: Card): boolean {
  return a.suit === b.suit && a.rank === b.rank;
}

const DISPLAY_SUIT_ORDER: Card["suit"][] = ["H", "S", "D", "C"];

function sortForDisplay(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    const suitDiff = DISPLAY_SUIT_ORDER.indexOf(a.suit) - DISPLAY_SUIT_ORDER.indexOf(b.suit);
    return suitDiff !== 0 ? suitDiff : a.rank - b.rank;
  });
}

// Fan cards are index-only, so the sliver only has to fit a large rank+suit, not a full pip face.
// 42 + 12×24 = 330, which fits a 360px phone with 16px padding.
const TARGET_ROW_WIDTH = 330;
const MIN_VISIBLE_SLIVER = 24;
const LIFT_OFFSET = 12;

function visibleSliverWidth(cardCount: number): number {
  if (cardCount <= 1) return FAN_CARD_WIDTH;
  const evenSpread = (TARGET_ROW_WIDTH - FAN_CARD_WIDTH) / (cardCount - 1);
  return Math.min(FAN_CARD_WIDTH, Math.max(MIN_VISIBLE_SLIVER, evenSpread));
}

export interface HandProps {
  cards: Card[];
  legalCards: Card[];
  onPlay: (card: Card) => void;
  interactive: boolean;
}

/**
 * Fanned hand. Each card shows only its top-left index (`face="fan"`) so overlapping neighbors
 * don't turn pip faces into noise. Legal cards lift and get a gold edge.
 */
export function Hand({ cards, legalCards, onPlay, interactive }: HandProps) {
  const sorted = sortForDisplay(cards);
  const overlapMargin = -(FAN_CARD_WIDTH - visibleSliverWidth(sorted.length));

  return (
    <View style={[styles.row, !interactive && styles.waiting]}>
      {sorted.map((card, index) => {
        const isLegal = legalCards.some((c) => sameCard(c, card));
        const canPlay = interactive && isLegal;
        return (
          <View
            key={`${card.suit}${card.rank}`}
            style={[
              index > 0 && { marginLeft: overlapMargin },
              canPlay && styles.lifted,
            ]}
          >
            <PlayingCard
              card={card}
              face="fan"
              disabled={!canPlay}
              highlighted={canPlay}
              onPress={canPlay ? () => onPlay(card) : undefined}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
  },
  waiting: {
    opacity: 0.88,
  },
  lifted: {
    transform: [{ translateY: -LIFT_OFFSET }],
  },
});
