import { useState } from "react";
import type { LayoutChangeEvent } from "react-native";
import { StyleSheet, View } from "react-native";
import type { Card } from "rules-engine";
import { FAN_CARD_HEIGHT, FAN_CARD_WIDTH, PlayingCard } from "./PlayingCard";

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

// Never smaller than every other `face="fan"` use in the app (the last-trick corner) — only ever
// bigger. Capped so a very wide viewport (web, tablet, or just a hand thinned down to 2-3 cards
// late in play) doesn't blow the cards up absurdly.
const MIN_SCALE = 1;
const MAX_SCALE = 1.6;
// The comfortable overlap target, as a fraction of a (scaled) card's own width, used to solve for
// the biggest scale that still lets all of a full 13-card hand fit — see `computeLayout`.
const SLIVER_RATIO = 0.45;
// However tight a hand gets forced to overlap at MIN_SCALE, always leave at least this much of a
// covered card's index visible — never fully hide one card behind its neighbor.
const ABSOLUTE_MIN_SLIVER = 20;
// A few horizontal px of breathing room so the outer cards' shadow/rotation never touch the
// measured container's exact edge.
const SIDE_MARGIN = 8;

// Fan geometry: each card rotates and lifts based on its position relative to the hand's center,
// tracing the shallow arc of a real hand of cards fanned out between two fingers — center highest
// and level, edges lower and rotated outward. Deliberately subtle (single-digit degrees/px): the
// point is a hand that reads as held, not a caricature that hides the corner indices.
const ARC_MAX_ROTATE_DEG = 8;
const ARC_LIFT = 10;
// Extra lift a legal/selectable card gets on top of its arc position — unchanged from before,
// still what makes a tappable card visually pop out of the row.
const SELECT_LIFT = 16;

/**
 * The available width to lay the hand out in isn't knowable from a fixed constant — it depends on
 * the actual device/viewport and, late in a hand, on how many cards are even left to show — so
 * this measures its own rendered width via `onLayout` on a full-width wrapper (see `styles.
 * wrapper`) rather than guessing from `useWindowDimensions()`, which would still need to account
 * for whatever padding/max-width the screen around it applies.
 */
function computeLayout(cardCount: number, containerWidth: number): { scale: number; sliver: number } {
  if (cardCount === 0 || containerWidth <= 0) return { scale: MIN_SCALE, sliver: FAN_CARD_WIDTH };
  if (cardCount === 1) return { scale: MAX_SCALE, sliver: FAN_CARD_WIDTH * MAX_SCALE };

  // The scale at which N cards, each showing a `SLIVER_RATIO`-of-its-own-width sliver, would
  // exactly fill containerWidth — the biggest the cards can be while still all fitting.
  const solvedScale = containerWidth / (FAN_CARD_WIDTH * (1 + (cardCount - 1) * SLIVER_RATIO));
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, solvedScale));
  const cardWidth = FAN_CARD_WIDTH * scale;
  const evenSpread = (containerWidth - cardWidth) / (cardCount - 1);
  const sliver = Math.min(cardWidth, Math.max(ABSOLUTE_MIN_SLIVER, evenSpread));
  return { scale, sliver };
}

export interface HandProps {
  cards: Card[];
  legalCards: Card[];
  onPlay: (card: Card) => void;
  interactive: boolean;
}

/**
 * The player's own hand — always a single row, arced like a real fanned hand of cards, sized as
 * large as the actually-measured available width allows (see `computeLayout`) rather than a fixed
 * small size. Each card shows only its top-left index (`face="fan"`) so overlapping neighbors
 * don't turn pip faces into noise. Legal cards lift further still and get a gold edge.
 */
export function Hand({ cards, legalCards, onPlay, interactive }: HandProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const sorted = sortForDisplay(cards);
  const { scale, sliver } = computeLayout(sorted.length, containerWidth);
  const overlapMargin = -(FAN_CARD_WIDTH * scale - sliver);
  const center = (sorted.length - 1) / 2;

  function handleLayout(event: LayoutChangeEvent) {
    setContainerWidth(event.nativeEvent.layout.width - SIDE_MARGIN * 2);
  }

  return (
    <View style={styles.wrapper} onLayout={handleLayout}>
      <View
        style={[styles.row, !interactive && styles.waiting, { minHeight: FAN_CARD_HEIGHT * MAX_SCALE + ARC_LIFT + SELECT_LIFT }]}
      >
        {sorted.map((card, index) => {
          const isLegal = legalCards.some((c) => sameCard(c, card));
          const canPlay = interactive && isLegal;
          // t ranges roughly [-1, 1] across the hand, 0 at the center — same normalized position
          // drives both the outward rotation and the arc's parabolic lift.
          const t = center === 0 ? 0 : (index - center) / center;
          const rotate = `${t * ARC_MAX_ROTATE_DEG}deg`;
          const arcLift = -ARC_LIFT * (1 - t * t);
          const translateY = arcLift - (canPlay ? SELECT_LIFT : 0);
          return (
            <View
              key={`${card.suit}${card.rank}`}
              style={[
                index > 0 && { marginLeft: overlapMargin },
                { transform: [{ rotate }, { translateY }] },
              ]}
            >
              <PlayingCard
                card={card}
                face="fan"
                scale={scale}
                disabled={!canPlay}
                highlighted={canPlay}
                onPress={canPlay ? () => onPlay(card) : undefined}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Stretches to the screen's actual available width (its parent's width is already bounded by
  // the game screen's own max-content-width and padding) so `onLayout` reports a real number to
  // size cards against — an unstyled View here would shrink-wrap to its own content instead,
  // which is exactly circular given that content's size is what we're trying to compute.
  wrapper: {
    width: "100%",
  },
  row: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  waiting: {
    opacity: 0.88,
  },
});
