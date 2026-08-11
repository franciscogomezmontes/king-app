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
  /** Which of `cards` are currently legal to play — highlighted when it's this hand's turn. */
  legalCards: Card[];
  onPlay: (card: Card) => void;
  /** False when it isn't this hand's turn — every card is then non-interactive and unhighlighted. */
  interactive: boolean;
}

/**
 * The human player's own fanned, tappable hand. Overlaps cards via flexbox negative margins
 * (not absolute positioning — the fan-layout pitfall the king-cross-platform-ui skill calls out)
 * so a 13-card hand still fits a phone-width screen, while keeping at least a
 * MIN_VISIBLE_SLIVER-wide strip of every card tappable.
 *
 * Legal cards get a highlighted border rather than dimming everything else — dimming most of a
 * 13-card hand down to near-invisibility read as broken/washed-out in practice, not helpful.
 * The whole hand dims slightly only when it isn't this player's turn at all (`interactive` false),
 * as a single passive "waiting" cue rather than a per-card judgment.
 */
export function Hand({ cards, legalCards, onPlay, interactive }: HandProps) {
  const overlapMargin = -(CARD_WIDTH - visibleSliverWidth(cards.length));

  return (
    <View style={[styles.row, !interactive && styles.waiting]}>
      {cards.map((card, index) => {
        const isLegal = legalCards.some((c) => sameCard(c, card));
        const canPlay = interactive && isLegal;
        return (
          <View key={`${card.suit}${card.rank}`} style={index > 0 ? { marginLeft: overlapMargin } : undefined}>
            <PlayingCard
              card={card}
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
    opacity: 0.85,
  },
});
