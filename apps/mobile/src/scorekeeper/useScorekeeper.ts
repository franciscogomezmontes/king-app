import { PlayerIndex } from "rules-engine";
import { useEffect, useState } from "react";
import { clearSession, loadSession, saveSession } from "./persistence";
import {
  ScorekeeperState,
  confirmHand as confirmHandState,
  createScorekeeperState,
  isGameComplete,
  setCount as setCountState,
  setDirection as setDirectionState,
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
  confirmHand: () => void;
}

/**
 * Owns Scorekeeper's session state (a plain `useState`, not a redux-style reducer — the
 * transformations in `state.ts` are already the update functions, so wrapping them in an action
 * type would just be ceremony) and its persistence: loads a saved session on mount, saves after
 * every confirmed hand, and clears the saved session once a game finishes.
 */
export function useScorekeeper(): UseScorekeeperResult {
  const [state, setState] = useState<ScorekeeperState>(createScorekeeperState);
  const [loading, setLoading] = useState(true);
  const [resumeCandidate, setResumeCandidate] = useState<ScorekeeperState | null>(null);

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
  }

  function setCount(player: PlayerIndex, value: number) {
    setState((s) => setCountState(s, player, value));
  }

  function setDirection(direction: "up" | "down") {
    setState((s) => setDirectionState(s, direction));
  }

  function confirmHand() {
    setState((s) => {
      const next = confirmHandState(s);
      if (isGameComplete(next)) {
        clearSession();
      } else {
        saveSession(next);
      }
      return next;
    });
  }

  return { loading, resumeCandidate, state, resume, startNew, setCount, setDirection, confirmHand };
}
