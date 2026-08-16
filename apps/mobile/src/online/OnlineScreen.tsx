import { useEffect, useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { GameRules, GameState, PlayerIndex } from "rules-engine";
import { canRequestRedeal, highestBid, legalCardsFor, SUITS } from "rules-engine";
import {
  AuctionSummary,
  Button,
  GAME_RULE_TOGGLE_KEYS,
  Hand,
  Panel,
  Scoreboard,
  ScorePanel,
  SegmentedToggle,
  SUIT_SYMBOLS,
  Surface,
  Switch,
  Table,
  colors,
  fonts,
  layout,
  radii,
  spacing,
  typography,
  useTranslation,
} from "ui-kit";
import { saveCompletedGame } from "../history/persistence";
import { pendingDecision, TrumpChoice } from "../game/store";
import { useSettings } from "../settings/useSettings";
import { loadServerAddress, saveServerAddress } from "./serverAddress";
import { createOnlineGameStore, OnlineGameStoreHook } from "./store";
import type { ClientEnvelope } from "./types";

const ALL_SEATS: PlayerIndex[] = [0, 1, 2, 3];

export interface OnlineScreenProps {
  onExit: () => void;
}

/** Top-level Online screen: a lobby (host or join), a waiting room once connected but before all
 * 4 seats are full, then the live game — reusing the exact ui-kit components Solo vs Computer
 * does. Unlike Solo, there's no local game engine here: `envelope` (from the store, itself just a
 * mirror of the server's last broadcast) is the only source of truth. */
export function OnlineScreen({ onExit }: OnlineScreenProps) {
  const [store] = useState<OnlineGameStoreHook>(() => createOnlineGameStore());
  const status = store((s) => s.status);
  const envelope = store((s) => s.envelope);
  const { settings } = useSettings();

  useEffect(() => {
    return () => {
      store.getState().leaveGame();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "connected" && envelope !== null) {
    if (envelope.game.phase === "awaiting-deal") {
      return <WaitingRoom store={store} envelope={envelope} onExit={onExit} />;
    }
    return <ActiveOnlineGame store={store} saveHistoryEnabled={settings.saveHistoryEnabled} onExit={onExit} />;
  }

  return <Lobby store={store} defaultGameRules={settings.gameRules} onExit={onExit} />;
}

function Lobby({
  store,
  defaultGameRules,
  onExit,
}: {
  store: OnlineGameStoreHook;
  defaultGameRules: GameRules;
  onExit: () => void;
}) {
  const { t } = useTranslation();
  const status = store((s) => s.status);
  const lastError = store((s) => s.lastError);
  const hostGame = store((s) => s.hostGame);
  const joinGame = store((s) => s.joinGame);

  const [step, setStep] = useState<"choice" | "create" | "join">("choice");
  const [displayName, setDisplayName] = useState("");
  const [address, setAddress] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [gameRules, setGameRules] = useState<GameRules>(defaultGameRules);

  useEffect(() => {
    loadServerAddress().then((saved) => {
      if (saved !== null) setAddress(saved);
    });
  }, []);

  async function submitHost() {
    await saveServerAddress(address);
    await hostGame(address, gameRules, displayName);
  }

  async function submitJoin() {
    await saveServerAddress(address);
    await joinGame(address, roomCode, displayName);
  }

  if (status === "connecting") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.content, { maxWidth: layout.maxContentWidth }]}>
          <Text style={styles.title}>{t("online:connecting")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer} contentContainerStyle={[styles.content, { maxWidth: layout.maxContentWidth }]}>
        <Text style={styles.title}>{t("online:title")}</Text>

        {lastError !== null && <Text style={styles.errorText}>{lastError}</Text>}

        {step === "choice" && (
          <>
            <View style={styles.choiceButtons}>
              <Button label={t("online:modeChoice.host")} onPress={() => setStep("create")} />
              <Button label={t("online:modeChoice.join")} onPress={() => setStep("join")} />
            </View>
            <Button label={t("game:backToMenu")} onPress={onExit} variant="ghost" />
          </>
        )}

        {step === "create" && (
          <>
            <NameAndAddressFields
              displayName={displayName}
              setDisplayName={setDisplayName}
              address={address}
              setAddress={setAddress}
            />
            <Text style={styles.sectionTitle}>{t("settings:gameRules.title")}</Text>
            <View style={styles.ruleList}>
              {GAME_RULE_TOGGLE_KEYS.map((key) => (
                <Surface key={key} style={styles.ruleRow}>
                  <Text style={styles.ruleName}>{t(`rules:ruleToggles.${key}.name`)}</Text>
                  <Switch
                    value={gameRules[key]}
                    onValueChange={(value) => setGameRules((prev) => ({ ...prev, [key]: value }))}
                  />
                </Surface>
              ))}
            </View>
            <Button label={t("online:create.button")} onPress={submitHost} disabled={!displayName.trim() || !address.trim()} />
            <Button label={t("game:backToMenu")} onPress={() => setStep("choice")} variant="ghost" />
          </>
        )}

        {step === "join" && (
          <>
            <NameAndAddressFields
              displayName={displayName}
              setDisplayName={setDisplayName}
              address={address}
              setAddress={setAddress}
            />
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t("online:roomCode.label")}</Text>
              <TextInput
                style={styles.textInput}
                value={roomCode}
                onChangeText={(text) => setRoomCode(text.toUpperCase())}
                placeholder={t("online:roomCode.placeholder")}
                placeholderTextColor={colors.muted}
                autoCapitalize="characters"
              />
            </View>
            <Button
              label={t("online:join.button")}
              onPress={submitJoin}
              disabled={!displayName.trim() || !address.trim() || !roomCode.trim()}
            />
            <Button label={t("game:backToMenu")} onPress={() => setStep("choice")} variant="ghost" />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function NameAndAddressFields({
  displayName,
  setDisplayName,
  address,
  setAddress,
}: {
  displayName: string;
  setDisplayName: (v: string) => void;
  address: string;
  setAddress: (v: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>{t("online:displayName.label")}</Text>
        <TextInput
          style={styles.textInput}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder={t("online:displayName.placeholder")}
          placeholderTextColor={colors.muted}
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>{t("online:serverAddress.label")}</Text>
        <TextInput
          style={styles.textInput}
          value={address}
          onChangeText={setAddress}
          placeholder={t("online:serverAddress.placeholder")}
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={styles.fieldHint}>{t("online:serverAddress.hint")}</Text>
      </View>
    </>
  );
}

function WaitingRoom({
  store,
  envelope,
  onExit,
}: {
  store: OnlineGameStoreHook;
  envelope: ClientEnvelope;
  onExit: () => void;
}) {
  const { t } = useTranslation();
  const leaveGame = store((s) => s.leaveGame);

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.content, { maxWidth: layout.maxContentWidth }]}>
        <Text style={styles.title}>{t("online:waiting.title")}</Text>
        <Text style={styles.roomCode}>{envelope.roomCode}</Text>
        <Text style={styles.fieldHint}>{t("online:waiting.shareHint")}</Text>

        <View style={styles.seatList}>
          {ALL_SEATS.map((seat) => (
            <Surface key={seat} style={styles.seatRow}>
              <Text style={styles.ruleName}>
                {seat === envelope.mySeat ? t("online:waiting.you") : t("online:waiting.seat", { number: seat + 1 })}
              </Text>
              <Text style={styles.seatStatus}>
                {envelope.seatLabels[seat] || t("online:waiting.empty")}
              </Text>
            </Surface>
          ))}
        </View>

        <Button
          label={t("online:leaveRoom")}
          onPress={() => {
            leaveGame();
            onExit();
          }}
          variant="ghost"
        />
      </View>
    </SafeAreaView>
  );
}

function turnMessage(
  decision: ReturnType<typeof pendingDecision>,
  isMyTurn: boolean,
  mySeat: PlayerIndex,
  seatLabels: Record<PlayerIndex, string>,
  t: ReturnType<typeof useTranslation>["t"],
): string {
  if (isMyTurn) return t("game:yourTurn");
  if ("player" in decision && decision.player !== mySeat) {
    return t("game:waiting", { name: seatLabels[decision.player] });
  }
  return "";
}

function ActiveOnlineGame({
  store,
  saveHistoryEnabled,
  onExit,
}: {
  store: OnlineGameStoreHook;
  saveHistoryEnabled: boolean;
  onExit: () => void;
}) {
  const { t } = useTranslation();
  const envelope = store((s) => s.envelope);
  const playCard = store((s) => s.playCard);
  const declareTrump = store((s) => s.declareTrump);
  const openAuction = store((s) => s.openAuction);
  const submitBid = store((s) => s.submitBid);
  const passBid = store((s) => s.passBid);
  const dealerDecide = store((s) => s.dealerDecide);
  const continueToNextHand = store((s) => s.continueToNextHand);
  const requestRedeal = store((s) => s.requestRedeal);
  const leaveGame = store((s) => s.leaveGame);
  const [showLastTrick, setShowLastTrick] = useState(true);

  if (envelope === null) {
    return <SafeAreaView style={styles.container} />;
  }

  const { game, biddingIndex, mySeat, seatLabels, seatConnected, handSizes } = envelope;
  const decision = pendingDecision(game, biddingIndex);

  function exit() {
    leaveGame();
    onExit();
  }

  if (game.phase === "game-complete") {
    return (
      <GameOverView game={game} envelope={envelope} saveHistoryEnabled={saveHistoryEnabled} onExit={exit} />
    );
  }

  if (game.phase === "hand-complete") {
    return <HandCompleteView game={game} seatLabels={seatLabels} onContinue={continueToNextHand} onExit={exit} />;
  }

  const isMyTurn = decision.kind === "play" && decision.player === mySeat;
  const legalCards = isMyTurn ? legalCardsFor(game, mySeat) : [];
  const tricksWon: Record<PlayerIndex, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
  for (const trick of game.completedTricks) tricksWon[trick.winner] += 1;
  const lastCompletedTrick = game.completedTricks[game.completedTricks.length - 1]?.plays ?? null;
  const eligibleForRedeal = canRequestRedeal(game, mySeat);
  const disconnectedSeats = ALL_SEATS.filter((seat) => seat !== mySeat && !seatConnected[seat]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.content, { maxWidth: layout.maxContentWidth }]}>
        <View style={styles.header}>
          <Button label={t("online:leaveRoom")} onPress={exit} variant="ghost" style={styles.headerLink} />
          <View style={styles.lastTrickToggle}>
            <Text style={styles.headerToggle}>{t("game:lastTrick.toggle")}</Text>
            <Switch
              value={showLastTrick}
              onValueChange={setShowLastTrick}
            />
          </View>
        </View>

        {disconnectedSeats.length > 0 && (
          <Text style={styles.disconnectedBanner}>
            {t("online:disconnected", { names: disconnectedSeats.map((s) => seatLabels[s]).join(", ") })}
          </Text>
        )}

        <ScorePanel handType={game.handType} handNumber={game.handIndex + 1} scores={game.cumulativeScores} seatLabels={seatLabels} />
        <Table
          humanSeat={mySeat}
          dealer={game.dealer}
          handSizes={handSizes}
          tricksWon={tricksWon}
          currentTrick={game.currentTrick}
          seatLabels={seatLabels}
          currentTurn={decision.kind === "play" ? decision.player : null}
          lastTrick={showLastTrick ? lastCompletedTrick : null}
          lastTrickLabel={t("game:lastTrick.label")}
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
        <OnlineDecisionPanel
          game={game}
          decision={decision}
          mySeat={mySeat}
          declareTrump={declareTrump}
          openAuction={openAuction}
          submitBid={submitBid}
          passBid={passBid}
          dealerDecide={dealerDecide}
        />
        <Text style={styles.turnIndicator}>{turnMessage(decision, isMyTurn, mySeat, seatLabels, t)}</Text>
        <Hand cards={game.hands[mySeat]} legalCards={legalCards} onPlay={playCard} interactive={isMyTurn} />
      </View>
    </SafeAreaView>
  );
}

interface OnlineDecisionPanelProps {
  game: GameState;
  decision: ReturnType<typeof pendingDecision>;
  mySeat: PlayerIndex;
  declareTrump: (choice: TrumpChoice) => void;
  openAuction: () => void;
  submitBid: (tricks: number) => void;
  passBid: () => void;
  dealerDecide: (sell: boolean) => void;
}

function OnlineDecisionPanel({
  game,
  decision,
  mySeat,
  declareTrump,
  openAuction,
  submitBid,
  passBid,
  dealerDecide,
}: OnlineDecisionPanelProps) {
  const { t } = useTranslation();
  const [direction, setDirection] = useState<"up" | "down">("up");
  const [backwards, setBackwards] = useState(false);
  const [bidText, setBidText] = useState("");

  if (decision.kind === "trump" && decision.player === mySeat) {
    return (
      <Panel style={styles.panel}>
        <Text style={styles.prompt}>{t("game:trump.prompt")}</Text>
        <View style={styles.row}>
          {SUITS.map((suit) => (
            <Pressable key={suit} style={styles.trumpButton} onPress={() => declareTrump({ trump: suit, direction, backwards })}>
              <Text style={styles.trumpButtonLabel}>{SUIT_SYMBOLS[suit]}</Text>
            </Pressable>
          ))}
          <Pressable style={styles.trumpButton} onPress={() => declareTrump({ trump: null, direction, backwards })}>
            <Text style={styles.trumpButtonLabelSmall}>{t("game:trump.noTrump")}</Text>
          </Pressable>
        </View>
        {game.ruleSet.playingDownEnabled && (
          <View style={styles.toggle}>
            <SegmentedToggle
              value={direction}
              onChange={setDirection}
              options={[
                { value: "up", label: t("rules:playingDirection.up") },
                { value: "down", label: t("rules:playingDirection.down") },
              ]}
            />
          </View>
        )}
        {game.ruleSet.backwardsEnabled && (
          <View style={[styles.toggle, styles.backwardsRow]}>
            <Text style={styles.toggleLabel}>{t("rules:ruleToggles.backwardsEnabled.name")}</Text>
            <Switch value={backwards} onValueChange={setBackwards} />
          </View>
        )}
        {decision.canOpenAuction && (
          <Button label={t("game:trump.openAuction")} onPress={openAuction} variant="secondary" style={styles.inlineButton} />
        )}
      </Panel>
    );
  }

  if (decision.kind === "bid" && decision.player === mySeat) {
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

  if (decision.kind === "dealer-decide" && decision.player === mySeat) {
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
      <ScrollView style={styles.scrollContainer} contentContainerStyle={[styles.content, { maxWidth: layout.maxContentWidth }]}>
        <Text style={styles.title}>{t("game:handComplete.title", { number: game.handIndex + 1 })}</Text>
        <Scoreboard handHistory={game.handHistory} seatLabels={seatLabels} />
        <Button label={t("game:handComplete.continue")} onPress={onContinue} />
        <Button label={t("online:leaveRoom")} onPress={onExit} variant="ghost" />
      </ScrollView>
    </SafeAreaView>
  );
}

function GameOverView({
  game,
  envelope,
  saveHistoryEnabled,
  onExit,
}: {
  game: GameState;
  envelope: ClientEnvelope;
  saveHistoryEnabled: boolean;
  onExit: () => void;
}) {
  const { t } = useTranslation();
  const seatLabels = envelope.seatLabels;
  const bestScore = Math.max(...ALL_SEATS.map((seat) => game.cumulativeScores[seat]));
  const winners = ALL_SEATS.filter((seat) => game.cumulativeScores[seat] === bestScore);
  const winnerLine =
    winners.length === 1
      ? t("game:scoreboard.winner", { name: seatLabels[winners[0]] })
      : t("game:scoreboard.tie", { names: winners.map((seat) => seatLabels[seat]).join(", ") });

  // Every connected device independently saves its own local copy under the same `gameId` — there
  // is no shared/cloud history in this anonymous slice (see the plan's "History integration" note).
  // Gated on the Settings "Save Game History" toggle, same as Solo vs Computer.
  useEffect(() => {
    if (!saveHistoryEnabled) return;
    saveCompletedGame({
      id: envelope.gameId,
      mode: "online",
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
      <ScrollView style={styles.scrollContainer} contentContainerStyle={[styles.content, { maxWidth: layout.maxContentWidth }]}>
        <Text style={styles.title}>{t("game:gameOver")}</Text>
        <Text style={styles.winnerText}>{winnerLine}</Text>
        <Scoreboard handHistory={game.handHistory} seatLabels={seatLabels} />
        <Button label={t("online:leaveRoom")} onPress={onExit} />
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
  lastTrickToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
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
  choiceButtons: {
    width: "100%",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  winnerText: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.gold,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  errorText: {
    color: colors.validationWarn,
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  disconnectedBanner: {
    color: colors.validationWarn,
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  sectionTitle: {
    fontFamily: fonts.displaySemi,
    fontSize: 16,
    color: colors.cream,
    alignSelf: "flex-start",
    marginTop: spacing.md,
  },
  field: {
    width: "100%",
    marginBottom: spacing.md,
  },
  fieldLabel: {
    color: colors.secondaryText,
    fontFamily: fonts.body,
    fontSize: 12,
    marginBottom: 4,
  },
  fieldHint: {
    ...typography.caption,
    marginTop: 4,
  },
  textInput: {
    width: "100%",
    color: colors.ink,
    backgroundColor: colors.cream,
    fontFamily: fonts.bodySemi,
    fontSize: 16,
    borderRadius: radii.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
  },
  ruleList: {
    width: "100%",
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  ruleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.goldMuted,
    borderRadius: radii.md,
  },
  ruleName: {
    color: colors.cream,
    fontFamily: fonts.bodySemi,
    fontSize: 14,
  },
  roomCode: {
    fontFamily: fonts.displaySemi,
    fontSize: 32,
    letterSpacing: 4,
    color: colors.gold,
    marginBottom: spacing.xs,
  },
  seatList: {
    width: "100%",
    gap: spacing.sm,
    marginVertical: spacing.lg,
  },
  seatRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.goldMuted,
    borderRadius: radii.md,
  },
  seatStatus: {
    color: colors.secondaryText,
    fontFamily: fonts.body,
    fontSize: 13,
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
  backwardsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
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
