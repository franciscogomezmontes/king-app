import { StyleSheet, View } from "react-native";
import type { Card } from "rules-engine";
import { CARD_WIDTH, PlayingCard } from "./PlayingCard";

function sameCard(a: Card, b: Card): boolean {
  return a.suit === b.suit && a.rank === b.rank;
}

// Display order only (not rules-engine's own SUITS order, which is S/H/D/C — two blacks then two
// reds in a row). Alternating colors means adjacent suit groups are never the same color, so the
// boundary between one suit and the next is obvious even at a glance across a long overlapped fan.
const DISPLAY_SUIT_ORDER: Card["suit"][] = ["H", "S", "D", "C"];

/** Groups cards by suit (alternating red/black) then rank ascending, so scanning "what can I
 * play" doesn't mean hunting through a shuffled hand. */
function sortForDisplay(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    const suitDiff = DISPLAY_SUIT_ORDER.indexOf(a.suit) - DISPLAY_SUIT_ORDER.indexOf(b.suit);
    return suitDiff !== 0 ? suitDiff : a.rank - b.rank;
  });
}

// A full 13-card hand must still fit a small phone viewport; below this many cards, spread them
// out with less (or no) overlap instead of always using the tightest packing.
const TARGET_ROW_WIDTH = 328;
// Rank/suit live in the card's top-left corner, so the visible sliver must stay wide enough to
// show that corner index in full. 60 + 12×22 = 324, which fits a 360px phone with 16px padding.
const MIN_VISIBLE_SLIVER = 22;
const LIFT_OFFSET = 14;

/** How much of each card (after the first) should stay uncovered by the next one. */
function visibleSliverWidth(cardCount: number): number {
  if (cardCount <= 1) return CARD_WIDTH;
  const evenSpread = (TARGET_ROW_WIDTH - CARD_WIDTH) / (cardCount - 1);
  return Math.min(CARD_WIDTH, Math.max(MIN_VISIBLE_SLIVER, evenSpread));
}

export interface HandProps {
  cards: Card[];
  /** Which of `cards` are currently legal to play — highlighted (and raised) when it's this hand's turn. */
  legalCards: Card[];
  onPlay: (card: Card) => void;
  /** False when it isn't this hand's turn — every card is then non-interactive and unhighlighted. */
  interactive: boolean;
}

/**
 * The human player's own fanned, tappable hand, sorted by suit (alternating red/black) then rank
 * so it reads as an organized hand instead of dealt-order chaos. Overlaps cards via flexbox
 * negative margins (not absolute positioning — the fan-layout pitfall the king-cross-platform-ui
 * skill calls out) so a 13-card hand still fits a phone-width screen, while keeping at least a
 * MIN_VISIBLE_SLIVER-wide strip of every card tappable.
 *
 * Legal cards get a highlighted border *and* rise slightly out of the fan, rather than dimming
 * everything else — dimming most of a 13-card hand down to near-invisibility read as
 * broken/washed-out in practice, and with cards this overlapped a border alone can still be easy
 * to miss. The whole hand dims slightly only when it isn't this player's turn at all
 * (`interactive` false), as a single passive "waiting" cue rather than a per-card judgment.
 */
export function Hand({ cards, legalCards, onPlay, interactive }: HandProps) {
  const sorted = sortForDisplay(cards);
  const overlapMargin = -(CARD_WIDTH - visibleSliverWidth(sorted.length));

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
  lifted: {
    transform: [{ translateY: -LIFT_OFFSET }],
  },
});
