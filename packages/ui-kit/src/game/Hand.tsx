import { StyleSheet, View } from "react-native";
import type { Card } from "rules-engine";
import { CARD_WIDTH, PlayingCard } from "./PlayingCard";

function sameCard(a: Card, b: Card): boolean {
  return a.suit === b.suit && a.rank === b.rank;
}

// A full 13-card hand must still fit a small phone viewport; below this many cards, spread them
// out with less (or no) overlap instead of always using the tightest packing.
const TARGET_ROW_WIDTH = 340;
const MIN_VISIBLE_SLIVER = 20; // never overlap a card down to less than this much visible width

/** How much of each card (after the first) should stay uncovered by the next one. */
function visibleSliverWidth(cardCount: number): number {
  if (cardCount <= 1) return CARD_WIDTH;
  const evenSpread = (TARGET_ROW_WIDTH - CARD_WIDTH) / (cardCount - 1);
  return Math.min(CARD_WIDTH, Math.max(MIN_VISIBLE_SLIVER, evenSpread));
}

export interface HandProps {
  cards: Card[];
  /** Which of `cards` are currently legal to play — everything else renders dimmed/disabled. */
  legalCards: Card[];
  onPlay: (card: Card) => void;
  /** False when it isn't this hand's turn — every card renders disabled regardless of legality. */
  interactive: boolean;
}

/**
 * The human player's own fanned, tappable hand. Overlaps cards via flexbox negative margins
 * (not absolute positioning — the fan-layout pitfall the king-cross-platform-ui skill calls out)
 * so a 13-card hand still fits a phone-width screen, while keeping at least a
 * MIN_VISIBLE_SLIVER-wide strip of every card tappable (a too-narrow sliver is both a real touch
 * target problem and, not coincidentally, exactly what broke this component's own Playwright
 * verification during development).
 */
export function Hand({ cards, legalCards, onPlay, interactive }: HandProps) {
  const overlapMargin = -(CARD_WIDTH - visibleSliverWidth(cards.length));

  return (
    <View style={styles.row}>
      {cards.map((card, index) => {
        const isLegal = legalCards.some((c) => sameCard(c, card));
        const canPlay = interactive && isLegal;
        return (
          <View key={`${card.suit}${card.rank}`} style={index > 0 ? { marginLeft: overlapMargin } : undefined}>
            <PlayingCard card={card} disabled={!canPlay} onPress={canPlay ? () => onPlay(card) : undefined} />
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
});
