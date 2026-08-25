import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { ImageSourcePropType } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  canRequestRedeal,
  Card,
  GameRules,
  GameState,
  highestBid,
  IllegalPlayReason,
  illegalPlayReason,
  legalCardsFor,
  PlayerIndex,
  SUITS,
} from "rules-engine";
import { saveCompletedGame } from "../history/persistence";
import { useSettings } from "../settings/useSettings";
import {
  AuctionSummary,
  BackButton,
  Button,
  CardBackStyle,
  Hand,
  Panel,
  Scoreboard,
  ScorePanel,
  SegmentedToggle,
  SUIT_SYMBOLS,
  Switch,
  Table,
  Toast,
  colors,
  fonts,
  layout,
  radii,
  spacing,
  typography,
  useTranslation,
} from "ui-kit";
import { useProfile } from "../profile/useProfile";
import { BOT_ROSTER } from "./botRoster";
import { loadSoloSession, saveSoloSession, clearSoloSession, SoloGameSession } from "./persistence";
import { Difficulty, GameStoreHook, TrumpChoice, createGameStore, resumeGameStore, pendingDecision } from "./store";

const ALL_SEATS: PlayerIndex[] = [0, 1, 2, 3];
const HUMAN_SEAT: PlayerIndex = 0;

export interface GameScreenProps {
  onExit: () => void;
  /** True when entered via Home's dedicated "Resume Game" button — skips the resume-or-new
   * prompt and goes straight into the saved game, since the user already explicitly said what
   * they want. The normal Solo vs Computer entry point (the default, false) still asks whenever a
   * session exists, so tapping it never silently discards progress in favor of a fresh deal. */
  autoResume?: boolean;
}

type Stage =
  | { kind: "checking" }
  | { kind: "resumePrompt"; session: SoloGameSession }
  | { kind: "resumed"; session: SoloGameSession }
  | { kind: "difficultyPicker" }
  | { kind: "active"; difficulty: Difficulty };

/** Top-level Solo vs. Computer screen: checks for a saved in-progress session, then either the
 * resume-or-new prompt, straight into a resumed game, or the difficulty picker followed by a
 * fresh one — then the live game either way. Settings are read here (not inside ActiveGame/
 * ResumedGame) because the game store is created once on mount from whatever ruleSet is passed
 * in — reading settings after that point could never retroactively apply them. */
export function GameScreen({ onExit, autoResume = false }: GameScreenProps) {
  const { loading: settingsLoading, settings } = useSettings();
  const { loading: profileLoading, profile } = useProfile();
  const [stage, setStage] = useState<Stage>({ kind: "checking" });

  useEffect(() => {
    loadSoloSession().then((session) => {
      if (session === null) setStage({ kind: "difficultyPicker" });
      else if (autoResume) setStage({ kind: "resumed", session });
      else setStage({ kind: "resumePrompt", session });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (settingsLoading || profileLoading || stage.kind === "checking") {
    return <SafeAreaView style={styles.container} />;
  }

  if (stage.kind === "resumePrompt") {
    return (
      <ResumePrompt
        onResume={() => setStage({ kind: "resumed", session: stage.session })}
        onStartNew={() => {
          clearSoloSession();
          setStage({ kind: "difficultyPicker" });
        }}
        onExit={onExit}
      />
    );
  }

  if (stage.kind === "resumed") {
    return (
      <ResumedGame
        session={stage.session}
        cardBackStyle={settings.cardBackStyle}
        saveHistoryEnabled={settings.saveHistoryEnabled}
        showScoreSummary={settings.showScoreSummary}
        profileName={profile.name}
        profileAvatarIndex={profile.avatarIndex}
        onExit={onExit}
      />
    );
  }

  if (stage.kind === "difficultyPicker") {
    return <DifficultyPicker onChoose={(difficulty) => setStage({ kind: "active", difficulty })} onExit={onExit} />;
  }

  return (
    <ActiveGame
      difficulty={stage.difficulty}
      gameRules={settings.gameRules}
      cardBackStyle={settings.cardBackStyle}
      saveHistoryEnabled={settings.saveHistoryEnabled}
      showScoreSummary={settings.showScoreSummary}
      profileName={profile.name}
      profileAvatarIndex={profile.avatarIndex}
      onExit={onExit}
    />
  );
}

function ResumePrompt({
  onResume,
  onStartNew,
  onExit,
}: {
  onResume: () => void;
  onStartNew: () => void;
  onExit: () => void;
}) {
  const { t } = useTranslation();
  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.content, { maxWidth: layout.maxContentWidth }]}>
        <View style={styles.header}>
          <BackButton onPress={onExit} label={t("game:backToMenu")} />
        </View>
        <Text style={styles.title}>{t("game:resume.title")}</Text>
        <Text style={styles.toggleLabel}>{t("game:resume.body")}</Text>
        <View style={styles.choiceButtons}>
          <Button label={t("game:resume.resume")} onPress={onResume} />
          <Button label={t("game:resume.startNew")} onPress={onStartNew} variant="secondary" />
        </View>
      </View>
    </SafeAreaView>
  );
}

function DifficultyPicker({ onChoose, onExit }: { onChoose: (d: Difficulty) => void; onExit: () => void }) {
  const { t } = useTranslation();
  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.content, { maxWidth: layout.maxContentWidth }]}>
        <View style={styles.header}>
          <BackButton onPress={onExit} label={t("game:backToMenu")} />
        </View>
        <Text style={styles.title}>{t("game:difficulty.label")}</Text>
        <View style={styles.choiceButtons}>
          <Button label={t("game:difficulty.easy")} onPress={() => onChoose("easy")} />
          <Button label={t("game:difficulty.normal")} onPress={() => onChoose("normal")} />
          <Button label={t("game:difficulty.hard")} onPress={() => onChoose("hard")} />
          <Button label={t("game:difficulty.expert")} onPress={() => onChoose("expert")} />
        </View>
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

const ILLEGAL_PLAY_MESSAGE_KEY: Record<IllegalPlayReason, string> = {
  "must-follow-suit": "game:illegalPlay.mustFollowSuit",
  "must-beat": "game:illegalPlay.mustBeat",
  "must-trump": "game:illegalPlay.mustTrump",
  "hearts-locked": "game:illegalPlay.heartsLocked",
};

/** Constructs a fresh game store and renders it — the normal "pick a difficulty and deal" path. */
function ActiveGame({
  difficulty,
  gameRules,
  cardBackStyle,
  saveHistoryEnabled,
  showScoreSummary,
  profileName,
  profileAvatarIndex,
  onExit,
}: {
  difficulty: Difficulty;
  gameRules: GameRules;
  cardBackStyle: CardBackStyle;
  saveHistoryEnabled: boolean;
  showScoreSummary: boolean;
  profileName: string;
  profileAvatarIndex: number | null;
  onExit: () => void;
}) {
  const [store] = useState<GameStoreHook>(() =>
    createGameStore({
      ruleSet: gameRules,
      humanSeat: HUMAN_SEAT,
      difficulty,
      // Randomized per new game (Francisco's request) — was hardcoded to seat 0 (always
      // HUMAN_SEAT), so hand 1's dealer never varied. `rules-engine`'s `rotateLeftEachHand`
      // already rotates correctly hand-to-hand off whatever this is; only the starting seat
      // needed fixing.
      firstDealer: ALL_SEATS[Math.floor(Math.random() * ALL_SEATS.length)],
      excludeAvatarIndex: profileAvatarIndex,
    }),
  );
  return (
    <GameTable
      store={store}
      cardBackStyle={cardBackStyle}
      saveHistoryEnabled={saveHistoryEnabled}
      showScoreSummary={showScoreSummary}
      profileName={profileName}
      profileAvatarIndex={profileAvatarIndex}
      onExit={onExit}
    />
  );
}

/** Constructs a store from a previously-saved in-progress session and renders it — the "resume"
 * path, whether reached via Home's dedicated button or the resume-or-new prompt. */
function ResumedGame({
  session,
  cardBackStyle,
  saveHistoryEnabled,
  showScoreSummary,
  profileName,
  profileAvatarIndex,
  onExit,
}: {
  session: SoloGameSession;
  cardBackStyle: CardBackStyle;
  saveHistoryEnabled: boolean;
  showScoreSummary: boolean;
  profileName: string;
  profileAvatarIndex: number | null;
  onExit: () => void;
}) {
  const [store] = useState<GameStoreHook>(() => resumeGameStore(session));
  return (
    <GameTable
      store={store}
      cardBackStyle={cardBackStyle}
      saveHistoryEnabled={saveHistoryEnabled}
      showScoreSummary={showScoreSummary}
      profileName={profileName}
      profileAvatarIndex={profileAvatarIndex}
      onExit={onExit}
    />
  );
}

/** The live table — reads everything from an already-constructed `store` (fresh or resumed, it
 * doesn't know or care which) and persists the in-progress session on every change, clearing it
 * once the game truly finishes, so navigating back to the menu mid-game never loses progress. */
function GameTable({
  store,
  cardBackStyle,
  saveHistoryEnabled,
  showScoreSummary,
  profileName,
  profileAvatarIndex,
  onExit,
}: {
  store: GameStoreHook;
  cardBackStyle: CardBackStyle;
  saveHistoryEnabled: boolean;
  showScoreSummary: boolean;
  profileName: string;
  profileAvatarIndex: number | null;
  onExit: () => void;
}) {
  const { t } = useTranslation();
  const game = store((s) => s.game);
  const humanSeat = store((s) => s.humanSeat);
  const difficulty = store((s) => s.difficulty);
  const botRosterIndices = store((s) => s.botRosterIndices);
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
  // Full results-so-far table, on demand — without it, a player can only see the running score as
  // bare numbers in ScorePanel and has to wait for a hand to finish to see the hand-by-hand table.
  const [showScoreboard, setShowScoreboard] = useState(false);
  // Expert difficulty only (see Hand's `explainIllegal`) — the message from the most recent
  // illegal tap, auto-dismissed a few seconds later so it never lingers past the moment it's
  // useful. `null` means nothing to show. The dismiss timer lives here (declared unconditionally,
  // before this component's several early `return`s below) rather than next to where the message
  // is set — React's rules of hooks don't allow a `useEffect` after a conditional return.
  const [illegalMessage, setIllegalMessage] = useState<string | null>(null);
  useEffect(() => {
    if (illegalMessage === null) return;
    const timer = setTimeout(() => setIllegalMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [illegalMessage]);

  useEffect(() => {
    if (game.phase === "game-complete") {
      clearSoloSession();
    } else {
      saveSoloSession({ game, humanSeat, difficulty, botRosterIndices, biddingIndex });
    }
  }, [game, humanSeat, difficulty, botRosterIndices, biddingIndex]);

  const decision = pendingDecision(game, biddingIndex);
  const bots = botRosterIndices.map((index) => BOT_ROSTER[index]);
  const seatLabels: Record<PlayerIndex, string> = {
    0: profileName.trim().length > 0 ? profileName : t("game:you"),
    1: bots[0].name,
    2: bots[1].name,
    3: bots[2].name,
  };
  const avatarSources: Partial<Record<PlayerIndex, ImageSourcePropType>> = {
    1: bots[0].image,
    2: bots[1].image,
    3: bots[2].image,
  };
  if (profileAvatarIndex !== null) avatarSources[0] = BOT_ROSTER[profileAvatarIndex].image;

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

  if (showScoreboard) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={[styles.content, { maxWidth: layout.maxContentWidth }]}
        >
          <Text style={styles.title}>{t("game:scoreboard.title")}</Text>
          <Scoreboard handHistory={game.handHistory} seatLabels={seatLabels} />
          <Button label={t("game:scoreboard.backToTable")} onPress={() => setShowScoreboard(false)} variant="secondary" />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const isHumanPlaying = decision.kind === "play" && decision.player === HUMAN_SEAT;
  const isDecisionOverlayVisible =
    (decision.kind === "trump" || decision.kind === "bid" || decision.kind === "dealer-decide") &&
    decision.player === HUMAN_SEAT;
  const legalCards = isHumanPlaying ? legalCardsFor(game, HUMAN_SEAT) : [];
  // Expert difficulty stops graying out illegal cards and instead explains a mistaken tap (see
  // Hand's `explainIllegal` doc comment) — "para que se sienta que el que juega es un jugador ya
  // experimentado" (Francisco's request).
  const explainIllegal = difficulty === "expert";
  function handleIllegalTap(card: Card) {
    const reason = illegalPlayReason(game, HUMAN_SEAT, card);
    if (reason !== null) setIllegalMessage(t(ILLEGAL_PLAY_MESSAGE_KEY[reason]));
  }
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
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[styles.content, { maxWidth: layout.maxContentWidth }]}
        // The hand row is the one thing that must never be unreachable — a taller table (avatars,
        // score bars) on a short real-device viewport (browser chrome eats vertical space
        // Playwright's emulated viewports don't account for) previously had no way to reach
        // whatever got pushed below the fold. This is the safety net; the spacing tightened
        // throughout this screen's styles is what keeps scrolling rarely necessary in practice.
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerLinks}>
            <BackButton onPress={onExit} label={t("game:backToMenu")} />
            <Button
              label={t("game:scoreboard.viewButton")}
              onPress={() => setShowScoreboard(true)}
              variant="ghost"
              style={styles.headerLink}
              labelStyle={styles.headerLinkLabel}
            />
          </View>
          <View style={styles.difficultyBadge}>
            <Text style={styles.difficultyText}>{t(`game:difficulty.${difficulty}`)}</Text>
          </View>
          <View style={styles.lastTrickToggle}>
            <Text style={styles.headerToggle}>{t("game:lastTrick.toggle")}</Text>
            <Switch value={showLastTrick} onValueChange={setShowLastTrick} />
          </View>
        </View>
        <ScorePanel
          handType={game.handType}
          handNumber={game.handIndex + 1}
          scores={game.cumulativeScores}
          seatLabels={seatLabels}
          showProgress={showScoreSummary}
        />
        <View style={styles.tableStage}>
          <Table
            humanSeat={HUMAN_SEAT}
            dealer={game.dealer}
            handSizes={handSizes}
            tricksWon={tricksWon}
            currentTrick={displayTrick}
            seatLabels={seatLabels}
            avatarSources={avatarSources}
            currentTurn={decision.kind === "play" ? decision.player : null}
            lastTrick={showLastTrick ? lastCompletedTrick : null}
            lastTrickLabel={t("game:lastTrick.label")}
            cardBackStyle={cardBackStyle}
          />
          {/* Trump/auction decisions happen before any card is played this hand, so the table's
           * center is always genuinely empty here — an overlay on top of it, not a fourth block
           * stacked below the table, is what keeps this bigger/clearer without pushing the
           * player's own hand further down the screen (see Francisco's explicit request). */}
          {isDecisionOverlayVisible && (
            <View style={styles.decisionOverlay} pointerEvents="box-none">
              <DecisionPanel
                game={game}
                decision={decision}
                declareTrump={declareTrump}
                openAuction={openAuction}
                submitBid={submitBid}
                passBid={passBid}
                dealerDecide={dealerDecide}
              />
            </View>
          )}
        </View>
        {game.handType === "positive" && game.positiveSetup !== null && game.phase === "playing" && (
          <AuctionSummary positiveSetup={game.positiveSetup} seatLabels={seatLabels} />
        )}
        {eligibleForRedeal && (
          <Panel style={styles.panel}>
            <Text style={styles.prompt}>{t("game:redeal.banner")}</Text>
            <Button label={t("game:redeal.button")} onPress={requestRedeal} variant="secondary" style={styles.inlineButton} />
          </Panel>
        )}
        {illegalMessage !== null && <Toast message={illegalMessage} />}
        <Text style={styles.turnIndicator}>{turnMessage(decision, isHumanPlaying, seatLabels, t)}</Text>
        <Hand
          cards={game.hands[HUMAN_SEAT]}
          legalCards={legalCards}
          onPlay={playCard}
          interactive={isHumanPlaying}
          explainIllegal={explainIllegal}
          onIllegalTap={handleIllegalTap}
        />
      </ScrollView>
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

// A bid can never exceed the 13 tricks a hand actually has.
const MAX_BID_TRICKS = 13;

function BidStepper({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
}) {
  const { t } = useTranslation();
  const canDecrease = value > min;
  const canIncrease = value < max;
  return (
    <View style={styles.stepperRow}>
      <Pressable
        accessibilityLabel={t("game:auction.bidDecrease")}
        disabled={!canDecrease}
        style={[styles.stepperButton, !canDecrease && styles.stepperButtonDisabled]}
        onPress={() => onChange(Math.max(min, value - 1))}
      >
        <Text style={styles.stepperButtonLabel}>−</Text>
      </Pressable>
      <Text style={styles.stepperValue}>{value}</Text>
      <Pressable
        accessibilityLabel={t("game:auction.bidIncrease")}
        disabled={!canIncrease}
        style={[styles.stepperButton, !canIncrease && styles.stepperButtonDisabled]}
        onPress={() => onChange(Math.min(max, value + 1))}
      >
        <Text style={styles.stepperButtonLabel}>+</Text>
      </Pressable>
    </View>
  );
}

function DecisionPanel({ game, decision, declareTrump, openAuction, submitBid, passBid, dealerDecide }: DecisionPanelProps) {
  const { t } = useTranslation();
  const [direction, setDirection] = useState<"up" | "down">("up");
  const [backwards, setBackwards] = useState(false);
  // The lowest legal bid always strictly exceeds the current high (submitBid throws otherwise) —
  // tracked here (rather than always starting the stepper at 1) so it's never possible to tap
  // "Bid" while sitting on an already-illegal value.
  const currentHigh = highestBid(game.positiveSetup?.bids ?? [])?.tricks ?? 0;
  const minBid = Math.min(MAX_BID_TRICKS, currentHigh + 1);
  const [bidValue, setBidValue] = useState(minBid);
  useEffect(() => {
    setBidValue(minBid);
    // Only re-syncs when the floor itself moves (another bid raised it since this player's own
    // last turn to bid) — an in-progress tap shouldn't get reset by anything else re-rendering.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minBid]);

  if (decision.kind === "trump" && decision.player === HUMAN_SEAT) {
    return (
      <Panel style={styles.overlayPanel}>
        <Text style={styles.overlayPrompt}>{t("game:trump.prompt")}</Text>
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

  if (decision.kind === "bid" && decision.player === HUMAN_SEAT) {
    return (
      <Panel style={styles.overlayPanel}>
        <Text style={styles.overlayPrompt}>
          {currentHigh > 0 ? t("game:auction.currentBid", { tricks: currentHigh }) : t("game:auction.noBids")}
        </Text>
        <BidStepper value={bidValue} min={minBid} max={MAX_BID_TRICKS} onChange={setBidValue} />
        <View style={styles.row}>
          <Button
            label={t("game:auction.bid")}
            variant="secondary"
            style={styles.inlineButton}
            onPress={() => submitBid(bidValue)}
          />
          <Button label={t("game:auction.pass")} onPress={passBid} variant="secondary" style={styles.inlineButton} />
        </View>
      </Panel>
    );
  }

  if (decision.kind === "dealer-decide" && decision.player === HUMAN_SEAT) {
    const top = highestBid(game.positiveSetup?.bids ?? []);
    return (
      <Panel style={styles.overlayPanel}>
        <Text style={styles.overlayPrompt}>{t("game:auction.dealerPrompt", { tricks: top?.tricks ?? 0 })}</Text>
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
        <View style={styles.header}>
          <BackButton onPress={onExit} label={t("game:backToMenu")} />
        </View>
        <Text style={styles.title}>{t("game:handComplete.title", { number: game.handIndex + 1 })}</Text>
        <Scoreboard handHistory={game.handHistory} seatLabels={seatLabels} />
        <Button label={t("game:handComplete.continue")} onPress={onContinue} />
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
        <View style={styles.header}>
          <BackButton onPress={onExit} label={t("game:backToMenu")} />
        </View>
        <Text style={styles.title}>{t("game:gameOver")}</Text>
        <Text style={styles.winnerText}>{winnerLine}</Text>
        <Scoreboard handHistory={game.handHistory} seatLabels={seatLabels} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.felt,
    alignItems: "center",
    // Was 48 — SafeAreaView already clears a real device's notch/status bar on native, and there's
    // no such thing to clear on web, so the old value was just unused top padding shrinking the
    // room left for the table and hand below it. See also ScorePanel/Avatar/OpponentSeat's own
    // tightened spacing — this screen's vertical budget on a real (shorter than Playwright's
    // emulated viewports) phone is tight enough that every one of these adds up.
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  content: {
    width: "100%",
    alignSelf: "center",
    alignItems: "center",
    paddingBottom: spacing.lg,
  },
  scrollContainer: {
    width: "100%",
  },
  // The anchor `decisionOverlay` positions itself against — every View is already an implicit
  // absolute-positioning context in RN, but this is named/kept separate from `Table` itself (a
  // ui-kit component) specifically so the overlay stays app-level, next to the store actions it
  // dispatches to, rather than needing to thread all of DecisionPanel's props through ui-kit.
  tableStage: {
    width: "100%",
  },
  decisionOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
  },
  header: {
    width: "100%",
    marginBottom: spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLink: {
    minWidth: 0,
    paddingHorizontal: 0,
    // Trimmed vertical padding and font size — this now sits stacked directly below the back
    // button (per Francisco's request to un-crowd them from a single row), so its own footprint
    // matters more than it used to now that it adds a full extra line to the header instead of
    // sharing one.
    paddingVertical: 1,
    alignSelf: "flex-start",
  },
  headerLinkLabel: {
    fontSize: 12,
    lineHeight: 14,
  },
  lastTrickToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  headerLinks: {
    alignItems: "flex-start",
    gap: 2,
  },
  // Which AI difficulty this Solo game is running at — always visible during play, not just at
  // the picker, per Francisco's request. Online has no such concept, so this lives here (a
  // GameScreen-local element) rather than as a prop on ui-kit's shared ScorePanel/Table.
  difficultyBadge: {
    backgroundColor: colors.goldMuted,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.gold,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  difficultyText: {
    color: colors.gold,
    fontFamily: fonts.bodySemi,
    fontSize: 12,
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
  // Trump/bid/dealer-decide, rendered inside `decisionOverlay` on top of the table felt — bigger
  // and higher-contrast than a plain inline `panel`/`prompt`, since it's now the one thing meant
  // to visually pop as a floating box "on the table" rather than just another stacked section.
  overlayPanel: {
    alignItems: "center",
    width: "auto",
    minWidth: 260,
    maxWidth: 340,
    borderWidth: 1,
    borderColor: colors.gold,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
  overlayPrompt: {
    color: colors.cream,
    fontFamily: fonts.bodySemi,
    fontSize: 17,
    marginBottom: spacing.md,
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
    width: 54,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  trumpButtonLabel: {
    fontSize: 26,
    color: colors.ink,
  },
  trumpButtonLabelSmall: {
    fontSize: 12,
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
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  stepperButton: {
    backgroundColor: colors.cream,
    borderRadius: radii.md,
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperButtonDisabled: {
    opacity: 0.4,
  },
  stepperButtonLabel: {
    fontSize: 26,
    fontFamily: fonts.bodyBold,
    color: colors.ink,
    // Pulls the glyph's own visual weight up to its box's true center — "−"/"+" both sit slightly
    // below center in this font at this size otherwise.
    marginTop: -2,
  },
  stepperValue: {
    minWidth: 48,
    textAlign: "center",
    color: colors.gold,
    fontFamily: fonts.bodyBold,
    fontSize: 28,
  },
  turnIndicator: {
    color: colors.cream,
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    minHeight: 18,
    marginTop: spacing.xs,
  },
});
