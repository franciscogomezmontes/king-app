import { useEffect, useRef } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import type { ImageSourcePropType } from "react-native";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from "react-native-reanimated";
import { colors, fonts, radii, spacing } from "../theme";

export interface WinCelebrationProps {
  visible: boolean;
  message: string;
  imageSource: ImageSourcePropType;
  onDismiss: () => void;
}

const APPEAR_DELAY_MS = 200;
const KING_ENTER_MS = 450;
const BUBBLE_ENTER_MS = 200;
const EXIT_MS = 280;

const KING_WIDTH = 320;
// The source art (apps/mobile/assets/celebration/kingOfHearts.png, background removed via a
// flood-fill cutout of the original photographed illustration) is a fixed 1408x768 waving-King
// illustration — this preserves its real proportions instead of stretching/cropping it.
const KING_HEIGHT = KING_WIDTH * (768 / 1408);

/**
 * A full-screen celebratory overlay for the one moment that used to just flash straight from the
 * table to a plain "Game Over" scoreboard: the human winning a solo game outright (no tie). The
 * King of Hearts slides in and "speaks" a localized congratulations in a speech bubble, then stays
 * up indefinitely — dismissed only by a tap anywhere on screen, never on its own timer (Francisco's
 * request: it's meant to be enjoyed for as long as the player wants).
 *
 * Purely presentational and self-contained: it owns its whole enter/exit sequence and only calls
 * back out via `onDismiss` once the exit animation has actually finished playing, so the caller
 * never has to coordinate timers of its own or guess when it's safe to stop rendering this — see
 * GameOverView's usage in apps/mobile/src/game/GameScreen.tsx, which decides *whether* to show
 * this (the winner-computation logic) and hands this component only `visible`/`message`.
 */
export function WinCelebration({ visible, message, imageSource, onDismiss }: WinCelebrationProps) {
  const overlayOpacity = useSharedValue(0);
  const kingOpacity = useSharedValue(0);
  const kingTranslateY = useSharedValue(50);
  const bubbleOpacity = useSharedValue(0);
  const bubbleScale = useSharedValue(0.6);
  // Guards against firing onDismiss twice — e.g. two taps landing before the exit animation this
  // component's own Pressable is still covered by has actually finished unmounting it.
  const dismissedRef = useRef(false);

  function fireDismiss() {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    onDismiss();
  }

  function triggerExit() {
    overlayOpacity.value = withTiming(0, { duration: EXIT_MS });
    bubbleOpacity.value = withTiming(0, { duration: EXIT_MS });
    kingTranslateY.value = withTiming(30, { duration: EXIT_MS });
    kingOpacity.value = withTiming(0, { duration: EXIT_MS }, (finished) => {
      if (finished) runOnJS(fireDismiss)();
    });
  }

  useEffect(() => {
    if (!visible) return;
    dismissedRef.current = false;
    // Explicit resets (not just relying on the initial useSharedValue default) so a future caller
    // toggling visible true -> false -> true replays the same entrance rather than starting from
    // wherever the last exit animation left off.
    overlayOpacity.value = 0;
    kingOpacity.value = 0;
    kingTranslateY.value = 50;
    bubbleOpacity.value = 0;
    bubbleScale.value = 0.6;

    overlayOpacity.value = withDelay(APPEAR_DELAY_MS, withTiming(1, { duration: 200 }));
    kingOpacity.value = withDelay(APPEAR_DELAY_MS, withTiming(1, { duration: KING_ENTER_MS }));
    kingTranslateY.value = withDelay(APPEAR_DELAY_MS, withSpring(0, { damping: 14, stiffness: 140 }));
    bubbleOpacity.value = withDelay(APPEAR_DELAY_MS + KING_ENTER_MS, withTiming(1, { duration: BUBBLE_ENTER_MS }));
    bubbleScale.value = withDelay(APPEAR_DELAY_MS + KING_ENTER_MS, withTiming(1, { duration: BUBBLE_ENTER_MS }));
    // No auto-hold/auto-exit timer (Francisco's request) — this now stays on screen until the
    // player actually taps to dismiss it, however long that takes.
    // Only re-runs when `visible` itself flips — the shared values are stable across renders and
    // deliberately not re-triggered by anything else.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const kingStyle = useAnimatedStyle(() => ({
    opacity: kingOpacity.value,
    transform: [{ translateY: kingTranslateY.value }],
  }));
  const bubbleStyle = useAnimatedStyle(() => ({
    opacity: bubbleOpacity.value,
    transform: [{ scale: bubbleScale.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, overlayStyle]}>
      {/* Full-bleed and behind `content` in paint order, but `content` has pointerEvents="none" so
       * a tap anywhere still reaches this and dismisses instantly — the "toca en cualquier parte
       * de la pantalla" requirement — without this ever staying mounted to block the ScrollView
       * underneath once dismissed (the whole tree unmounts via the `visible` prop going false). */}
      <Pressable style={StyleSheet.absoluteFill} onPress={triggerExit} accessibilityLabel={message} />
      <View style={styles.content} pointerEvents="none">
        <Animated.View style={[styles.bubble, bubbleStyle]}>
          <Text style={styles.bubbleText}>{message}</Text>
          <View style={styles.bubbleTail} />
        </Animated.View>
        <Animated.View style={kingStyle}>
          <Image source={imageSource} style={styles.kingImage} resizeMode="contain" />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    alignItems: "center",
    justifyContent: "center",
    // See InfoTooltip.tsx's own doc comment on why an absolutely-positioned child needs an
    // explicit zIndex/elevation to reliably out-rank sibling content rather than assuming JSX
    // order alone will paint it on top.
    zIndex: 1000,
    elevation: 20,
  },
  content: {
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  bubble: {
    backgroundColor: colors.cream,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.gold,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: 2,
    maxWidth: 300,
  },
  bubbleText: {
    color: colors.ink,
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    textAlign: "center",
  },
  bubbleTail: {
    position: "absolute",
    bottom: -10,
    alignSelf: "center",
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 12,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: colors.cream,
  },
  kingImage: {
    width: KING_WIDTH,
    height: KING_HEIGHT,
  },
});
