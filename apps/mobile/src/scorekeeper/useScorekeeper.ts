import { PlayerIndex } from "rules-engine";
import { useEffect, useState } from "react";
import type { ScoreboardEntry } from "ui-kit";
import { saveCompletedGame, updateCompletedGame } from "../history/persistence";
import { clearSession, loadSession, saveSession } from "./persistence";
import {
  ScorekeeperState,
  confirmHand as confirmHandState,
  createScorekeeperState,
  displayName,
  editHand as editHandState,
  isGameComplete,
  setCount as setCountState,
  setDate as setDateState,
  setDirection as setDirectionState,
  setPlayerName as setPlayerNameState,
} from "./state";

export interface UseScorekeeperResult {
  /** True until the initial check for a saved session resolves. */
  loading: boolean;
  /** A saved session found on mount, awaiting the player's resume/start-new decision. Null once
   * resolved (or if nothing was saved). */
  resumeCandidate: ScorekeeperState | null;
  state: ScorekeeperState;
  resume: () => void;
  startNew: () => void;
  setCount: (player: PlayerIndex, value: number) => void;
  setDirection: (direction: "up" | "down") => void;
  setPlayerName: (player: PlayerIndex, name: string) => void;
  setDate: (date: string) => void;
  confirmHand: () => void;
  editHand: (index: number, counts: Record<PlayerIndex, number>, direction: "up" | "down") => void;
}

function toCompletedGame(state: ScorekeeperState, id: string) {
  const playerNames: Record<PlayerIndex, string> = {
    0: displayName(state, 0, "Player 1"),
    1: displayName(state, 1, "Player 2"),
    2: displayName(state, 2, "Player 3"),
    3: displayName(state, 3, "Player 4"),
  };
  const handHistory: ScoreboardEntry[] = state.history.map((entry) => ({
    handType: entry.handType,
    scores: entry.scores,
    positiveSetup: entry.direction !== null ? { direction: entry.direction } : null,
  }));
  return {
    id,
    mode: "scorekeeper" as const,
    date: state.date,
    savedAt: new Date().toISOString(),
    playerNames,
    finalScores: state.cumulativeScores,
    handHistory,
  };
}

function newGameId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Owns Scorekeeper's session state (a plain `useState`, not a redux-style reducer — the
 * transformations in `state.ts` are already the update functions, so wrapping them in an action
 * type would just be ceremony) and its persistence: loads a saved in-progress session on mount,
 * saves after every confirmed hand, and — once the 10th hand completes the game — moves it out of
 * the in-progress slot and into the permanent game history instead of just discarding it.
 */
export function useScorekeeper(): UseScorekeeperResult {
  const [state, setState] = useState<ScorekeeperState>(createScorekeeperState);
  const [loading, setLoading] = useState(true);
  const [resumeCandidate, setResumeCandidate] = useState<ScorekeeperState | null>(null);
  // Set once, when the 10th hand completes a game — lets a later hand edit overwrite the same
  // saved history record in place instead of appending a duplicate. Null whenever there's no
  // completed game yet to update (including a freshly started game, before/after startNew()).
  const [completedGameId, setCompletedGameId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadSession().then((saved) => {
      if (cancelled) return;
      if (saved !== null) setResumeCandidate(saved);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function resume() {
    if (resumeCandidate !== null) setState(resumeCandidate);
    setResumeCandidate(null);
  }

  function startNew() {
    clearSession();
    setState(createScorekeeperState());
    setResumeCandidate(null);
    setCompletedGameId(null);
  }

  function setCount(player: PlayerIndex, value: number) {
    setState((s) => setCountState(s, player, value));
  }

  function setDirection(direction: "up" | "down") {
    setState((s) => setDirectionState(s, direction));
  }

  function setPlayerName(player: PlayerIndex, name: string) {
    setState((s) => setPlayerNameState(s, player, name));
  }

  function setDate(date: string) {
    setState((s) => setDateState(s, date));
  }

  function confirmHand() {
    setState((s) => {
      const next = confirmHandState(s);
      if (isGameComplete(next)) {
        clearSession();
        const id = newGameId();
        setCompletedGameId(id);
        saveCompletedGame(toCompletedGame(next, id));
      } else {
        saveSession(next);
      }
      return next;
    });
  }

  function editHand(index: number, counts: Record<PlayerIndex, number>, direction: "up" | "down") {
    setState((s) => {
      const next = editHandState(s, index, counts, direction);
      if (isGameComplete(next)) {
        if (completedGameId !== null) updateCompletedGame(completedGameId, toCompletedGame(next, completedGameId));
      } else {
        saveSession(next);
      }
      return next;
    });
  }

  return {
    loading,
    resumeCandidate,
    state,
    resume,
    startNew,
    setCount,
    setDirection,
    setPlayerName,
    setDate,
    confirmHand,
    editHand,
  };
}
