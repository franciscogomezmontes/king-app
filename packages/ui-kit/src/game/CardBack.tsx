import { Image, StyleSheet, View } from "react-native";
import type { ImageSourcePropType } from "react-native";
import { colors, radii } from "../theme";
import { CARD_HEIGHT, CARD_WIDTH } from "./PlayingCard";

export type CardBackStyle = "royal" | "suitMedallion" | "kMonogram" | "artDecoSunburst";

/** In display order for a settings picker — the app's real, finished card-back art. Every variant
 * here is a real illustrated image (see .claude/skills/king-ui-modernization); no code-drawn
 * placeholder patterns remain. */
export const CARD_BACK_STYLES: CardBackStyle[] = ["royal", "suitMedallion", "kMonogram", "artDecoSunburst"];

// The finished card-back art lives under apps/mobile/assets (not inside this package) because
// that's where every other app asset lives — ui-kit reaches across that package boundary with a
// plain relative require() rather than duplicating the file into a second location, since
// apps/mobile is (today) this package's only consumer. If a second app ever consumes ui-kit, this
// is the thing to revisit — copy the art into ui-kit's own assets at that point.
const CARD_BACK_IMAGES: Record<CardBackStyle, ImageSourcePropType> = {
  royal: require("../../../../apps/mobile/assets/cardbacks/royal.jpg"),
  suitMedallion: require("../../../../apps/mobile/assets/cardbacks/suit-medallion.jpg"),
  kMonogram: require("../../../../apps/mobile/assets/cardbacks/k-monogram.jpg"),
  artDecoSunburst: require("../../../../apps/mobile/assets/cardbacks/art-deco-sunburst.jpg"),
};

export interface CardBackProps {
  variant?: CardBackStyle;
  /** Uniformly scales the whole card-back, reserving exactly `scale`× the natural footprint in
   * layout — OpponentSeat uses this to render opponents' hidden hands a bit smaller than a card
   * actually in play. Defaults to 1. Same explicit-both-dimensions nested-View technique as
   * PlayingCard's own `scale` prop (see that component's doc comment for why). */
  scale?: number;
}

/** A face-down card — opponents' hidden hands. Every variant is a real illustrated card back, each
 * with its own integrated border/frame design already baked into the art, so there's no second
 * gold frame drawn around it here (that would double up the border look instead of matching it). */
export function CardBack({ variant = "royal", scale = 1 }: CardBackProps) {
  const content = renderCardBack(variant);
  if (scale === 1) return content;
  return (
    <View style={{ width: CARD_WIDTH * scale, height: CARD_HEIGHT * scale, alignItems: "center", justifyContent: "center" }}>
      <View style={{ width: CARD_WIDTH, height: CARD_HEIGHT, transform: [{ scale }] }}>{content}</View>
    </View>
  );
}

function renderCardBack(variant: CardBackStyle) {
  // The Image gets *explicit* pixel dimensions (matching the 1px-border-adjusted card size), not
  // `flex: 1` — a `flex`-sized Image with no explicit width/height rendered at native resolution
  // cropped to a tiny corner instead of scaling down to fit (the "zoomed in" report), the same
  // class of Yoga/flex-grow ambiguity already hit and fixed in ScoreProgress.tsx — Image apparently
  // doesn't reliably participate in flex-basis sizing the way a plain View does.
  const inset = 1; // card's own borderWidth
  return (
    <View style={styles.card}>
      <Image
        source={CARD_BACK_IMAGES[variant]}
        style={[styles.image, { width: CARD_WIDTH - inset * 2, height: CARD_HEIGHT - inset * 2 }]}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.gold,
    overflow: "hidden",
  },
  image: {
    borderRadius: radii.card,
  },
});
