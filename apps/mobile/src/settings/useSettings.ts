import { useEffect, useState } from "react";
import type { GameRules } from "rules-engine";
import type { CardBackStyle, FaceCardStyle } from "ui-kit";
import { loadSettings, saveSettings } from "./persistence";
import { DEFAULT_SETTINGS, Settings } from "./types";

export interface UseSettingsResult {
  /** True until the saved settings (or the defaults, if none were saved) have loaded. */
  loading: boolean;
  settings: Settings;
  setCardBackStyle: (style: CardBackStyle) => void;
  setFaceCardStyle: (style: FaceCardStyle) => void;
  setGameRule: (key: keyof GameRules, value: boolean) => void;
  setSaveHistoryEnabled: (value: boolean) => void;
  setShowScoreSummary: (value: boolean) => void;
}

/** Owns the player's cross-mode preferences (card back style, the game-setup rules menu) and
 * their persistence — loads once on mount, saves on every change. Callers that create game state
 * from `settings.gameRules` (Solo vs Computer's store) should wait for `!loading` first — see
 * GameScreen.tsx — since the store is only created once per game and won't pick up a settings
 * change that lands after it already exists. */
export function useSettings(): UseSettingsResult {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadSettings().then((loaded) => {
      if (cancelled) return;
      setSettings(loaded);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function setCardBackStyle(cardBackStyle: CardBackStyle) {
    setSettings((prev) => {
      const next: Settings = { ...prev, cardBackStyle };
      saveSettings(next);
      return next;
    });
  }

  function setFaceCardStyle(faceCardStyle: FaceCardStyle) {
    setSettings((prev) => {
      const next: Settings = { ...prev, faceCardStyle };
      saveSettings(next);
      return next;
    });
  }

  function setGameRule(key: keyof GameRules, value: boolean) {
    setSettings((prev) => {
      const next: Settings = { ...prev, gameRules: { ...prev.gameRules, [key]: value } };
      saveSettings(next);
      return next;
    });
  }

  function setSaveHistoryEnabled(saveHistoryEnabled: boolean) {
    setSettings((prev) => {
      const next: Settings = { ...prev, saveHistoryEnabled };
      saveSettings(next);
      return next;
    });
  }

  function setShowScoreSummary(showScoreSummary: boolean) {
    setSettings((prev) => {
      const next: Settings = { ...prev, showScoreSummary };
      saveSettings(next);
      return next;
    });
  }

  return { loading, settings, setCardBackStyle, setFaceCardStyle, setGameRule, setSaveHistoryEnabled, setShowScoreSummary };
}
