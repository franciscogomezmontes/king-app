import { useEffect, useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { canRequestRedeal, GameRules, GameState, highestBid, legalCardsFor, PlayerIndex, SUITS } from "rules-engine";
import { saveCompletedGame } from "../history/persistence";
import { useSettings } from "../settings/useSettings";
import {
  AuctionSummary,
  Button,
  CardBackStyle,
  Hand,
  Panel,
  Scoreboard,
  ScorePanel,
  SUIT_SYMBOLS,
  Table,
  colors,
  fonts,
  layout,
  radii,
  spacing,
  typography,
  useTranslation,
} from "ui-kit";
import { Difficulty, GameStoreHook, TrumpChoice, createGameStore, pendingDecision } from "./store";

const ALL_SEATS: PlayerIndex[] = [0, 1, 2, 3];
const HUMAN_SEAT: PlayerIndex = 0;

export interface GameScreenProps {
  onExit: () => void;
}

/** Top-level Solo vs. Computer screen: waits for the player's saved Settings (game rules + card
 * back style) to load, then a tiny difficulty picker, then the live game. Settings are read here
 * rather than inside ActiveGame because the game store is created once on mount from whatever
 * ruleSet is passed in — reading settings after that point could never retroactively apply them. */
export function GameScreen({ onExit }: GameScreenProps) {
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const { loading, settings } = useSettings();

  if (loading) {
    return <SafeAreaView style={styles.container} />;
  }
  if (difficulty === null) {
    return <DifficultyPicker onChoose={setDifficulty} onExit={onExit} />;
  }
  return (
    <ActiveGame
      difficulty={difficulty}
      gameRules={settings.gameRules}
      cardBackStyle={settings.cardBackStyle}
      saveHistoryEnabled={settings.saveHistoryEnabled}
      onExit={onExit}
    />
  );
}

function DifficultyPicker({ onChoose, onExit }: { onChoose: (d: Difficulty) => void; onExit: () => void }) {
  const { t } = useTranslation();
  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.content, { maxWidth: layout.maxContentWidth }]}>
        <Text style={styles.title}>{t("game:difficulty.label")}</Text>
        <Button label={t("game:difficulty.easy")} onPress={() => onChoose("easy")} />
        <Button label={t("game:difficulty.normal")} onPress={() => onChoose("normal")} />
        <Button label={t("game:backToMenu")} onPress={onExit} variant="ghost" />
      </View>
    </SafeAreaView>
  );
}

function turnMessage(
  decision: ReturnType<typeof pendingDecision>,
  isHumanPlaying: boolean,
  seatLabels: Record<PlayerIndex, string>,
  t: ReturnType<typeof useTranslation>["t"],
): string {
  if (isHumanPlaying) return t("game:yourTurn");
  if ("player" in decision && decision.player !== HUMAN_SEAT) {
    return t("game:waiting", { name: seatLabels[decision.player] });
  }
  return "";
}

function ActiveGame({
  difficulty,
  gameRules,
  cardBackStyle,
  saveHistoryEnabled,
  onExit,
}: {
  difficulty: Difficulty;
  gameRules: GameRules;
  cardBackStyle: CardBackStyle;
  saveHistoryEnabled: boolean;
  onExit: () => void;
}) {
  const { t } = useTranslation();
  const [store] = useState<GameStoreHook>(() =>
    createGameStore({ ruleSet: gameRules, humanSeat: HUMAN_SEAT, difficulty, firstDealer: 0 }),
  );
  const game = store((s) => s.game);
  const biddingIndex = store((s) => s.biddingIndex);
  const displayTrick = store((s) => s.displayTrick);
  const playCard = store((s) => s.playCard);
  const declareTrump = store((s) => s.declareTrump);
  const openAuction = store((s) => s.openAuction);
  const submitBid = store((s) => s.submitBid);
  const passBid = store((s) => s.passBid);
  const dealerDecide = store((s) => s.dealerDecide);
  const continueToNextHand = store((s) => s.continueToNextHand);
  const requestRedeal = store((s) => s.requestRedeal);
  // Local, not persisted — a per-session display preference, not game state. Defaults on: the
  // point is to make it discoverable, not to add a hunt-for-the-setting step.
  const [showLastTrick, setShowLastTrick] = useState(true);

  const decision = pendingDecision(game, biddingIndex);
  const seatLabels: Record<PlayerIndex, string> = {
    0: t("game:you"),
    1: t("game:bot", { number: 1 }),
    2: t("game:bot", { number: 2 }),
    3: t("game:bot", { number: 3 }),
  };

  if (game.phase === "game-complete") {
    return (
      <GameOverView game={game} seatLabels={seatLabels} saveHistoryEnabled={saveHistoryEnabled} onExit={onExit} />
    );
  }

  if (game.phase === "hand-complete") {
    return (
      <HandCompleteView game={game} seatLabels={seatLabels} onContinue={continueToNextHand} onExit={onExit} />
    );
  }

  const isHumanPlaying = decision.kind === "play" && decision.player === HUMAN_SEAT;
  const legalCards = isHumanPlaying ? legalCardsFor(game, HUMAN_SEAT) : [];
  const handSizes: Record<PlayerIndex, number> = {
    0: game.hands[0].length,
    1: game.hands[1].length,
    2: game.hands[2].length,
    3: game.hands[3].length,
  };
  const tricksWon: Record<PlayerIndex, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
  for (const trick of game.completedTricks) tricksWon[trick.winner] += 1;
  const lastCompletedTrick = game.completedTricks[game.completedTricks.length - 1]?.plays ?? null;
  const eligibleForRedeal = canRequestRedeal(game, HUMAN_SEAT);

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.content, { maxWidth: layout.maxContentWidth }]}>
        <View style={styles.header}>
          <Button label={t("game:backToMenu")} onPress={onExit} variant="ghost" style={styles.headerLink} />
          <Pressable onPress={() => setShowLastTrick((v) => !v)}>
            <Text style={styles.headerToggle}>
              {t("game:lastTrick.toggle")}: {showLastTrick ? "✓" : "✗"}
            </Text>
          </Pressable>
        </View>
        <ScorePanel
          handType={game.handType}
          handNumber={game.handIndex + 1}
          scores={game.cumulativeScores}
          seatLabels={seatLabels}
        />
        <Table
          humanSeat={HUMAN_SEAT}
          dealer={game.dealer}
          handSizes={handSizes}
          tricksWon={tricksWon}
          currentTrick={displayTrick}
          seatLabels={seatLabels}
          currentTurn={decision.kind === "play" ? decision.player : null}
          lastTrick={showLastTrick ? lastCompletedTrick : null}
          lastTrickLabel={t("game:lastTrick.label")}
          cardBackStyle={cardBackStyle}
        />
        {game.handType === "positive" && game.positiveSetup !== null && game.phase === "playing" && (
          <AuctionSummary positiveSetup={game.positiveSetup} seatLabels={seatLabels} />
        )}
        {eligibleForRedeal && (
          <Panel style={styles.panel}>
            <Text style={styles.prompt}>{t("game:redeal.banner")}</Text>
            <Button label={t("game:redeal.button")} onPress={requestRedeal} variant="secondary" style={styles.inlineButton} />
          </Panel>
        )}
        <DecisionPanel
          game={game}
          decision={decision}
          declareTrump={declareTrump}
          openAuction={openAuction}
          submitBid={submitBid}
          passBid={passBid}
          dealerDecide={dealerDecide}
        />
        <Text style={styles.turnIndicator}>{turnMessage(decision, isHumanPlaying, seatLabels, t)}</Text>
        <Hand cards={game.hands[HUMAN_SEAT]} legalCards={legalCards} onPlay={playCard} interactive={isHumanPlaying} />
      </View>
    </SafeAreaView>
  );
}

interface DecisionPanelProps {
  game: GameState;
  decision: ReturnType<typeof pendingDecision>;
  declareTrump: (choice: TrumpChoice) => void;
  openAuction: () => void;
  submitBid: (tricks: number) => void;
  passBid: () => void;
  dealerDecide: (sell: boolean) => void;
}

function DecisionPanel({ game, decision, declareTrump, openAuction, submitBid, passBid, dealerDecide }: DecisionPanelProps) {
  const { t } = useTranslation();
  const [direction, setDirection] = useState<"up" | "down">("up");
  const [backwards, setBackwards] = useState(false);
  const [bidText, setBidText] = useState("");

  if (decision.kind === "trump" && decision.player === HUMAN_SEAT) {
    return (
      <Panel style={styles.panel}>
        <Text style={styles.prompt}>{t("game:trump.prompt")}</Text>
        <View style={styles.row}>
          {SUITS.map((suit) => (
            <Pressable
              key={suit}
              style={styles.trumpButton}
              onPress={() => declareTrump({ trump: suit, direction, backwards })}
            >
              <Text style={styles.trumpButtonLabel}>{SUIT_SYMBOLS[suit]}</Text>
            </Pressable>
          ))}
          <Pressable
            style={styles.trumpButton}
            onPress={() => declareTrump({ trump: null, direction, backwards })}
          >
            <Text style={styles.trumpButtonLabelSmall}>{t("game:trump.noTrump")}</Text>
          </Pressable>
        </View>
        {game.ruleSet.playingDownEnabled && (
          <Pressable style={styles.toggle} onPress={() => setDirection((d) => (d === "up" ? "down" : "up"))}>
            <Text style={styles.toggleLabel}>
              {direction === "up" ? t("rules:playingDirection.up") : t("rules:playingDirection.down")}
            </Text>
          </Pressable>
        )}
        {game.ruleSet.backwardsEnabled && (
          <Pressable style={styles.toggle} onPress={() => setBackwards((b) => !b)}>
            <Text style={styles.toggleLabel}>
              {t("rules:ruleToggles.backwardsEnabled.name")}: {backwards ? "✓" : "✗"}
            </Text>
          </Pressable>
        )}
        {decision.canOpenAuction && (
          <Button label={t("game:trump.openAuction")} onPress={openAuction} variant="secondary" style={styles.inlineButton} />
        )}
      </Panel>
    );
  }

  if (decision.kind === "bid" && decision.player === HUMAN_SEAT) {
    const currentHigh = highestBid(game.positiveSetup?.bids ?? [])?.tricks ?? 0;
    return (
      <Panel style={styles.panel}>
        <Text style={styles.prompt}>
          {currentHigh > 0 ? t("game:auction.currentBid", { tricks: currentHigh }) : t("game:auction.noBids")}
        </Text>
        <View style={styles.row}>
          <TextInput
            style={styles.bidInput}
            keyboardType="number-pad"
            value={bidText}
            onChangeText={setBidText}
            placeholder={t("game:auction.bidPrompt")}
            placeholderTextColor={colors.muted}
          />
          <Button
            label={t("game:auction.bid")}
            variant="secondary"
            style={styles.inlineButton}
            onPress={() => {
              const tricks = parseInt(bidText, 10);
              if (Number.isFinite(tricks)) {
                submitBid(tricks);
                setBidText("");
              }
            }}
          />
          <Button label={t("game:auction.pass")} onPress={passBid} variant="secondary" style={styles.inlineButton} />
        </View>
      </Panel>
    );
  }

  if (decision.kind === "dealer-decide" && decision.player === HUMAN_SEAT) {
    const top = highestBid(game.positiveSetup?.bids ?? []);
    return (
      <Panel style={styles.panel}>
        <Text style={styles.prompt}>{t("game:auction.dealerPrompt", { tricks: top?.tricks ?? 0 })}</Text>
        <View style={styles.row}>
          <Button label={t("game:auction.sell")} onPress={() => dealerDecide(true)} variant="secondary" style={styles.inlineButton} />
          <Button label={t("game:auction.keep")} onPress={() => dealerDecide(false)} variant="secondary" style={styles.inlineButton} />
        </View>
      </Panel>
    );
  }

  return null;
}

/** Shown after every completed hand (not just the last) — the results table so far, paused until
 * the human explicitly continues, so a hand's outcome is never skipped past unseen. */
function HandCompleteView({
  game,
  seatLabels,
  onContinue,
  onExit,
}: {
  game: GameState;
  seatLabels: Record<PlayerIndex, string>;
  onContinue: () => void;
  onExit: () => void;
}) {
  const { t } = useTranslation();
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[styles.content, { maxWidth: layout.maxContentWidth }]}
      >
        <Text style={styles.title}>{t("game:handComplete.title", { number: game.handIndex + 1 })}</Text>
        <Scoreboard handHistory={game.handHistory} seatLabels={seatLabels} />
        <Button label={t("game:handComplete.continue")} onPress={onContinue} />
        <Button label={t("game:backToMenu")} onPress={onExit} variant="ghost" />
      </ScrollView>
    </SafeAreaView>
  );
}

function GameOverView({
  game,
  seatLabels,
  saveHistoryEnabled,
  onExit,
}: {
  game: GameState;
  seatLabels: Record<PlayerIndex, string>;
  saveHistoryEnabled: boolean;
  onExit: () => void;
}) {
  const { t } = useTranslation();
  const bestScore = Math.max(...ALL_SEATS.map((seat) => game.cumulativeScores[seat]));
  const winners = ALL_SEATS.filter((seat) => game.cumulativeScores[seat] === bestScore);
  const winnerLine =
    winners.length === 1
      ? t("game:scoreboard.winner", { name: seatLabels[winners[0]] })
      : t("game:scoreboard.tie", { names: winners.map((seat) => seatLabels[seat]).join(", ") });

  // Fires once when this view mounts (i.e. once per finished game) — folds the just-finished
  // game into the same shared history Scorekeeper saves to, so both modes show up in one place.
  // Gated on the Settings "Save Game History" toggle — off means new games just don't get saved.
  useEffect(() => {
    if (!saveHistoryEnabled) return;
    saveCompletedGame({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      mode: "solo",
      date: new Date().toISOString().slice(0, 10),
      savedAt: new Date().toISOString(),
      playerNames: seatLabels,
      finalScores: game.cumulativeScores,
      handHistory: game.handHistory.map((entry) => ({
        handType: entry.handType,
        scores: entry.scores,
        positiveSetup: entry.positiveSetup !== null ? { direction: entry.positiveSetup.direction } : null,
      })),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[styles.content, { maxWidth: layout.maxContentWidth }]}
      >
        <Text style={styles.title}>{t("game:gameOver")}</Text>
        <Text style={styles.winnerText}>{winnerLine}</Text>
        <Scoreboard handHistory={game.handHistory} seatLabels={seatLabels} />
        <Button label={t("game:backToMenu")} onPress={onExit} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.felt,
    alignItems: "center",
    paddingTop: 48,
    paddingHorizontal: spacing.lg,
  },
  content: {
    width: "100%",
    alignSelf: "center",
    alignItems: "center",
  },
  scrollContainer: {
    width: "100%",
  },
  header: {
    width: "100%",
    marginBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLink: {
    minWidth: 0,
    paddingHorizontal: 0,
    alignSelf: "flex-start",
  },
  headerToggle: {
    color: colors.secondaryText,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  title: {
    ...typography.displayMd,
    marginBottom: spacing.lg,
  },
  winnerText: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.gold,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  panel: {
    alignItems: "center",
    marginVertical: spacing.sm,
  },
  prompt: {
    color: colors.cream,
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  trumpButton: {
    backgroundColor: colors.cream,
    borderRadius: radii.md,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  trumpButtonLabel: {
    fontSize: 20,
    color: colors.ink,
  },
  trumpButtonLabelSmall: {
    fontSize: 11,
    fontFamily: fonts.bodyBold,
    textAlign: "center",
    color: colors.ink,
  },
  toggle: {
    marginTop: spacing.sm,
    paddingVertical: 4,
  },
  toggleLabel: {
    color: colors.secondaryText,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  inlineButton: {
    minWidth: 0,
    paddingVertical: spacing.sm,
    paddingHorizontal: 14,
  },
  bidInput: {
    backgroundColor: colors.cream,
    borderRadius: radii.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
    width: 90,
    color: colors.ink,
    fontFamily: fonts.body,
  },
  turnIndicator: {
    color: colors.cream,
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    minHeight: 18,
    marginTop: spacing.sm,
  },
});
