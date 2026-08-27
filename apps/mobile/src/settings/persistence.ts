import AsyncStorage from "@react-native-async-storage/async-storage";
import type { KeyValueStorage } from "../scorekeeper/persistence";
import { DEFAULT_SETTINGS, Settings, SETTINGS_VERSION } from "./types";

const STORAGE_KEY = "king:settings:v1";

// Mirrors ui-kit's own CardBack.tsx `CARD_BACK_STYLES` — deliberately a local copy, not a runtime
// `import { CARD_BACK_STYLES } from "ui-kit"`: ui-kit's package entry point (`main: "src/index.ts"`)
// re-exports its whole component tree, including RN/JSX component files apps/mobile's vitest setup
// has no transform pipeline for outside the Metro bundler it normally runs under — pulling that in
// at runtime here broke Vitest's SSR transform entirely (a parse error in an unrelated file
// several imports deep), confirmed by reproducing it with nothing but that one import in an
// otherwise-empty test file. A `import type` for `Settings["cardBackStyle"]`'s own type (below)
// stays fine either way — type-only imports are erased before anything runs. Keep this list in
// sync with CardBack.tsx's `CARD_BACK_STYLES` if a variant is ever added, renamed, or removed.
const KNOWN_CARD_BACK_STYLES: ReadonlyArray<Settings["cardBackStyle"]> = ["royal", "medallion", "laurel", "sunburst"];

/** Loads the player's saved settings, if any. Never throws into the caller — a missing key,
 * malformed JSON, or a `version` from an older/incompatible shape all just resolve to the
 * defaults rather than crashing the app on startup. */
export async function loadSettings(storage: KeyValueStorage = AsyncStorage): Promise<Settings> {
  try {
    const raw = await storage.getItem(STORAGE_KEY);
    if (raw === null) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    if (parsed.version !== SETTINGS_VERSION) return DEFAULT_SETTINGS;
    // A card-back variant that's since been renamed or removed (e.g. a blob saved back when this
    // field could be "lattice"/"rings"/"frame", or later "suitMedallion"/"kMonogram"/
    // "artDecoSunburst", before either rename) falls back to the current default instead of being
    // kept as-is — CARD_BACK_IMAGES (CardBack.tsx) has no entry for a stale value, which would
    // otherwise hand `<Image>` an `undefined` source instead of a real card back.
    const cardBackStyle: Settings["cardBackStyle"] =
      parsed.cardBackStyle !== undefined && KNOWN_CARD_BACK_STYLES.includes(parsed.cardBackStyle)
        ? parsed.cardBackStyle
        : DEFAULT_SETTINGS.cardBackStyle;
    // `gameRules` is merged field-by-field (not replaced wholesale) so a persisted blob saved
    // before some future rules-engine toggle existed still gets that toggle's default instead of
    // `undefined` — the whole reason this settings menu is meant to grow over time.
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      cardBackStyle,
      gameRules: { ...DEFAULT_SETTINGS.gameRules, ...parsed.gameRules },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Settings, storage: KeyValueStorage = AsyncStorage): Promise<void> {
  await storage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
