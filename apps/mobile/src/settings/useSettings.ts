import { useEffect, useState } from "react";
import type { CardBackStyle } from "ui-kit";
import { loadSettings, saveSettings } from "./persistence";
import { DEFAULT_SETTINGS, Settings } from "./types";

export interface UseSettingsResult {
  /** True until the saved settings (or the defaults, if none were saved) have loaded. Solo mode
   * renders with DEFAULT_SETTINGS during this brief window rather than blocking on it — a card
   * back style that flips once loading finishes is a non-issue compared to gating the whole
   * screen on a settings fetch. */
  loading: boolean;
  settings: Settings;
  setCardBackStyle: (style: CardBackStyle) => void;
}

/** Owns the player's cross-mode preferences (currently just the card back style) and their
 * persistence — loads once on mount, saves on every change. */
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

  return { loading, settings, setCardBackStyle };
}
