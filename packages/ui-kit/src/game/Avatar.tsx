import { Image, StyleSheet, Text, View } from "react-native";
import type { ImageSourcePropType } from "react-native";
import { colors, fonts } from "../theme";
import { DealerBadge } from "./DealerBadge";

export type AvatarSize = "xs" | "sm" | "md" | "lg";

// "sm" is the table-context size — each opponent's corner badge and the human's own seat marker
// (Table.tsx) — sized as large as the corner-badge layout can hold without overwhelming the
// card-back it sits on; bumped twice now (32 -> 40 -> 52) chasing "still too small" feedback, each
// time re-verified against the card-back proportions in OpponentSeat.tsx before landing. "xs" is
// kept as a smaller option for a future denser context, not used anywhere today.
const DIAMETER: Record<AvatarSize, number> = { xs: 32, sm: 52, md: 56, lg: 72 };
const RING_PADDING = 3;
// Scaling the name label down with the avatar keeps a 3-opponent row from looking top-heavy —
// "xs"'s tighter marginTop specifically is what claws back the height OpponentSeat needed most.
const NAME_METRICS: Record<AvatarSize, { fontSize: number; marginTop: number }> = {
  xs: { fontSize: 11, marginTop: 2 },
  sm: { fontSize: 13, marginTop: 3 },
  md: { fontSize: 14, marginTop: 4 },
  lg: { fontSize: 15, marginTop: 4 },
};

export interface AvatarProps {
  name: string;
  /** A real portrait, once art exists (see .claude/skills/king-ui-modernization's asset-spec
   * note) — omit for the placeholder silhouette, today's default for every seat. Swapping in real
   * art later only means passing this prop; nothing else about the component changes. */
  imageSource?: ImageSourcePropType;
  /** This player's turn right now — the strongest, highest-priority visual cue this component
   * has: a bright ring/glow around the portrait, not just a subtly different background. */
  isActive?: boolean;
  /** This player is dealing the current hand — independent of whose turn it is to act. */
  isDealer?: boolean;
  size?: AvatarSize;
  /** False when a caller already shows this player's name elsewhere (e.g. OpponentSeat's own
   * label, when Avatar is used as a small corner badge over a card-back rather than a standalone
   * portrait+name stack) — omits the built-in name text so it isn't rendered twice. Defaults to
   * true, the original standalone behavior. */
  showName?: boolean;
}

/**
 * A player's identity: circular portrait + name, with two independent optional visual states —
 * turn-active (glow ring) and dealer (badge). Presentational only: no game-state reads, no store
 * access, every flag a plain boolean prop — renders identically for a human, a bot, or a remote
 * player, so Scorekeeper (which has no player-identity concept at all — see
 * king-cross-platform-ui) never needs to know this exists, and Solo-vs-AI / Online can share it
 * unchanged. Per .claude/skills/king-ui-modernization's baseline audit, "no player identity" (bots
 * as plain text over a card-back rectangle, no strong current-turn cue) was the single biggest gap
 * against reference apps — the turn-glow specifically was flagged highest priority.
 *
 * The glow's gold *border* is the cross-platform-reliable part of "active" (works identically on
 * Web/Android/iOS); the colored `shadow*`/`elevation` glow layered on top is a real enhancement on
 * iOS/web (colored shadows render there) but degrades to Android's default neutral elevation
 * shadow rather than disappearing — never the *only* signal something changed, matching
 * king-cross-platform-ui's "verify explicitly, don't assume parity" guidance.
 */
export function Avatar({
  name,
  imageSource,
  isActive = false,
  isDealer = false,
  size = "md",
  showName = true,
}: AvatarProps) {
  const diameter = DIAMETER[size];
  const ringDiameter = diameter + RING_PADDING * 2;
  const nameMetrics = NAME_METRICS[size];

  return (
    <View style={styles.container}>
      <View style={styles.stack}>
        <View
          style={[
            styles.ring,
            { width: ringDiameter, height: ringDiameter, borderRadius: ringDiameter / 2 },
            isActive && styles.ringActive,
          ]}
        >
          <View style={[styles.portrait, { width: diameter, height: diameter, borderRadius: diameter / 2 }]}>
            {imageSource ? (
              <Image
                source={imageSource}
                style={{ width: diameter, height: diameter, borderRadius: diameter / 2 }}
              />
            ) : (
              <Silhouette diameter={diameter} />
            )}
          </View>
        </View>
        {isDealer && (
          <View style={styles.dealerBadge}>
            <DealerBadge />
          </View>
        )}
      </View>
      {showName && (
        <Text
          style={[styles.name, { fontSize: nameMetrics.fontSize, marginTop: nameMetrics.marginTop }, isActive && styles.nameActive]}
          numberOfLines={1}
        >
          {name}
        </Text>
      )}
    </View>
  );
}

/**
 * Placeholder portrait — a simple head-and-shoulders silhouette on a solid tint, standing in until
 * real avatar art exists. Never renders once a caller passes `imageSource`.
 */
function Silhouette({ diameter }: { diameter: number }) {
  const head = diameter * 0.38;
  const shoulders = diameter * 0.92;
  return (
    <View style={[styles.silhouetteBg, { width: diameter, height: diameter, borderRadius: diameter / 2 }]}>
      <View
        style={[
          styles.silhouettePart,
          { width: head, height: head, borderRadius: head / 2, top: diameter * 0.14, left: (diameter - head) / 2 },
        ]}
      />
      <View
        style={[
          styles.silhouettePart,
          {
            width: shoulders,
            height: shoulders,
            borderRadius: shoulders / 2,
            top: diameter * 0.62,
            left: (diameter - shoulders) / 2,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  stack: {
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  ringActive: {
    borderColor: colors.gold,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 8,
  },
  portrait: {
    overflow: "hidden",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.goldMuted,
  },
  dealerBadge: {
    position: "absolute",
    top: -4,
    right: -4,
  },
  name: {
    color: colors.cream,
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    maxWidth: 84,
  },
  nameActive: {
    color: colors.gold,
  },
  silhouetteBg: {
    backgroundColor: colors.accent,
    overflow: "hidden",
  },
  silhouettePart: {
    position: "absolute",
    backgroundColor: colors.muted,
  },
});
