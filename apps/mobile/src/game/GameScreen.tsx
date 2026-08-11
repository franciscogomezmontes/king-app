import { useState } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";
import { DEFAULT_GAME_RULES, GameState, highestBid, legalCardsFor, PlayerIndex, SUITS } from "rules-engine";
import { Hand, OpponentSeat, ScorePanel, SUIT_SYMBOLS, TrickArea, useTranslation } from "ui-kit";
import { Difficulty, GameStoreHook, TrumpChoice, createGameStore, pendingDecision } from "./store";

const ALL_SEATS: PlayerIndex[] = [0, 1, 2, 3];
const HUMAN_SEAT: PlayerIndex = 0;

export interface GameScreenProps {
  onExit: () => void;
}

/** Top-level Solo vs. Computer screen: a tiny difficulty picker, then the live game. */
export function GameScreen({ onExit }: GameScreenProps) {
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);

  if (difficulty === null) {
    return <DifficultyPicker onChoose={setDifficulty} onExit={onExit} />;
  }
  return <ActiveGame difficulty={difficulty} onExit={onExit} />;
}

function DifficultyPicker({ onChoose, onExit }: { onChoose: (d: Difficulty) => void; onExit: () => void }) {
  const { t } = useTranslation();
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>{t("game:difficulty.label")}</Text>
      <Pressable style={styles.primaryButton} onPress={() => onChoose("easy")}>
        <Text style={styles.primaryButtonLabel}>{t("game:difficulty.easy")}</Text>
      </Pressable>
      <Pressable style={styles.primaryButton} onPress={() => onChoose("normal")}>
        <Text style={styles.primaryButtonLabel}>{t("game:difficulty.normal")}</Text>
      </Pressable>
      <Pressable style={styles.linkButton} onPress={onExit}>
        <Text style={styles.linkButtonLabel}>{t("game:backToMenu")}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function ActiveGame({ difficulty, onExit }: { difficulty: Difficulty; onExit: () => void }) {
  const { t } = useTranslation();
  const [store] = useState<GameStoreHook>(() =>
    createGameStore({ ruleSet: DEFAULT_GAME_RULES, humanSeat: HUMAN_SEAT, difficulty, firstDealer: 0 }),
  );
  const game = store((s) => s.game);
  const biddingIndex = store((s) => s.biddingIndex);
  const playCard = store((s) => s.playCard);
  const declareTrump = store((s) => s.declareTrump);
  const openAuction = store((s) => s.openAuction);
  const submitBid = store((s) => s.submitBid);
  const passBid = store((s) => s.passBid);
  const dealerDecide = store((s) => s.dealerDecide);

  const decision = pendingDecision(game, biddingIndex);
  const seatLabels: Record<PlayerIndex, string> = {
    0: t("game:you"),
    1: t("game:bot", { number: 1 }),
    2: t("game:bot", { number: 2 }),
    3: t("game:bot", { number: 3 }),
  };

  if (game.phase === "game-complete") {
    return <GameOverView game={game} seatLabels={seatLabels} onExit={onExit} />;
  }

  const opponents = ALL_SEATS.filter((seat) => seat !== HUMAN_SEAT);
  const isHumanPlaying = decision.kind === "play" && decision.player === HUMAN_SEAT;
  const legalCards = isHumanPlaying ? legalCardsFor(game, HUMAN_SEAT) : [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onExit}>
          <Text style={styles.linkButtonLabel}>{t("game:backToMenu")}</Text>
        </Pressable>
      </View>
      <ScorePanel
        handType={game.handType}
        handNumber={game.handIndex + 1}
        scores={game.cumulativeScores}
        seatLabels={seatLabels}
      />
      <View style={styles.opponents}>
        {opponents.map((seat) => (
          <OpponentSeat
            key={seat}
            label={seatLabels[seat]}
            cardCount={game.hands[seat].length}
            isCurrentTurn={"player" in decision && decision.player === seat}
          />
        ))}
      </View>
      <TrickArea plays={game.currentTrick} seatLabels={seatLabels} />
      <DecisionPanel
        game={game}
        decision={decision}
        declareTrump={declareTrump}
        openAuction={openAuction}
        submitBid={submitBid}
        passBid={passBid}
        dealerDecide={dealerDecide}
      />
      <Text style={styles.turnIndicator}>{isHumanPlaying ? t("game:yourTurn") : ""}</Text>
      <Hand cards={game.hands[HUMAN_SEAT]} legalCards={legalCards} onPlay={playCard} interactive={isHumanPlaying} />
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
      <View style={styles.panel}>
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
              {t("rules:ruleToggles.backwards.name")}: {backwards ? "✓" : "✗"}
            </Text>
          </Pressable>
        )}
        {decision.canOpenAuction && (
          <Pressable style={styles.secondaryButton} onPress={openAuction}>
            <Text style={styles.secondaryButtonLabel}>{t("game:trump.openAuction")}</Text>
          </Pressable>
        )}
      </View>
    );
  }

  if (decision.kind === "bid" && decision.player === HUMAN_SEAT) {
    const currentHigh = highestBid(game.positiveSetup?.bids ?? [])?.tricks ?? 0;
    return (
      <View style={styles.panel}>
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
            placeholderTextColor="#8fae9c"
          />
          <Pressable
            style={styles.secondaryButton}
            onPress={() => {
              const tricks = parseInt(bidText, 10);
              if (Number.isFinite(tricks)) {
                submitBid(tricks);
                setBidText("");
              }
            }}
          >
            <Text style={styles.secondaryButtonLabel}>{t("game:auction.bid")}</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={passBid}>
            <Text style={styles.secondaryButtonLabel}>{t("game:auction.pass")}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (decision.kind === "dealer-decide" && decision.player === HUMAN_SEAT) {
    const top = highestBid(game.positiveSetup?.bids ?? []);
    return (
      <View style={styles.panel}>
        <Text style={styles.prompt}>{t("game:auction.dealerPrompt", { tricks: top?.tricks ?? 0 })}</Text>
        <View style={styles.row}>
          <Pressable style={styles.secondaryButton} onPress={() => dealerDecide(true)}>
            <Text style={styles.secondaryButtonLabel}>{t("game:auction.sell")}</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => dealerDecide(false)}>
            <Text style={styles.secondaryButtonLabel}>{t("game:auction.keep")}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return null;
}

function GameOverView({
  game,
  seatLabels,
  onExit,
}: {
  game: GameState;
  seatLabels: Record<PlayerIndex, string>;
  onExit: () => void;
}) {
  const { t } = useTranslation();
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>{t("game:gameOver")}</Text>
      <Text style={styles.prompt}>{t("game:finalScores")}</Text>
      {ALL_SEATS.map((seat) => (
        <Text key={seat} style={styles.finalScore}>
          {seatLabels[seat]}: {game.cumulativeScores[seat]}
        </Text>
      ))}
      <Pressable style={styles.primaryButton} onPress={onExit}>
        <Text style={styles.primaryButtonLabel}>{t("game:backToMenu")}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b3d2e",
    alignItems: "center",
    paddingTop: 48,
    paddingHorizontal: 16,
  },
  header: {
    width: "100%",
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#f5e6c8",
    marginBottom: 16,
  },
  opponents: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginVertical: 8,
  },
  panel: {
    alignItems: "center",
    backgroundColor: "#0f4d38",
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    width: "100%",
  },
  prompt: {
    color: "#f5e6c8",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  trumpButton: {
    backgroundColor: "#f5e6c8",
    borderRadius: 8,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  trumpButtonLabel: {
    fontSize: 20,
  },
  trumpButtonLabelSmall: {
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  toggle: {
    marginTop: 8,
    paddingVertical: 4,
  },
  toggleLabel: {
    color: "#c9d8cf",
    fontSize: 13,
  },
  secondaryButton: {
    backgroundColor: "#1c7a53",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  secondaryButtonLabel: {
    color: "#f5e6c8",
    fontWeight: "600",
  },
  primaryButton: {
    backgroundColor: "#0f4d38",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginVertical: 8,
    minWidth: 160,
    alignItems: "center",
  },
  primaryButtonLabel: {
    color: "#f5e6c8",
    fontSize: 16,
    fontWeight: "700",
  },
  linkButton: {
    marginTop: 16,
  },
  linkButtonLabel: {
    color: "#8fae9c",
    fontSize: 14,
  },
  bidInput: {
    backgroundColor: "#f5e6c8",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    width: 90,
    color: "#1a1a1a",
  },
  turnIndicator: {
    color: "#f5e6c8",
    fontSize: 13,
    fontWeight: "600",
    minHeight: 18,
    marginTop: 8,
  },
  finalScore: {
    color: "#f5e6c8",
    fontSize: 16,
    marginVertical: 2,
  },
});
