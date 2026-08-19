import { createI18n, DEFAULT_LOCALE } from "ui-kit";
import { GAME_RESOURCES } from "../game/resources";
import { HISTORY_RESOURCES } from "../history/resources";
import { HOW_TO_PLAY_RESOURCES } from "../howToPlay/resources";
import { ONLINE_RESOURCES } from "../online/resources";
import { PROFILE_RESOURCES } from "../profile/resources";
import { SCOREKEEPER_RESOURCES } from "../scorekeeper/resources";
import { SETTINGS_RESOURCES } from "../settings/resources";
import { APP_RESOURCES } from "./resources";

export { DEFAULT_LOCALE, SUPPORTED_LOCALES, type Locale } from "ui-kit";

/**
 * Builds this app's i18next instance: always starts at DEFAULT_LOCALE (Spanish — the family this
 * app is for plays in Spanish, regardless of what a given phone's system language happens to be)
 * rather than device-detected, and merges in this app's own "app", "game", "scorekeeper",
 * "history", "settings", "online", "howToPlay", and "profile" namespaces alongside ui-kit's
 * "rules" namespace. The EN/ES switcher on the home screen (App.tsx) is still how a player picks a
 * different language for that session — see king-app CLAUDE.md's i18n section for why
 * device-only detection isn't relied on.
 */
export function initI18n() {
  return createI18n({
    locale: DEFAULT_LOCALE,
    resources: {
      en: {
        ...APP_RESOURCES.en,
        ...GAME_RESOURCES.en,
        ...SCOREKEEPER_RESOURCES.en,
        ...HISTORY_RESOURCES.en,
        ...SETTINGS_RESOURCES.en,
        ...ONLINE_RESOURCES.en,
        ...HOW_TO_PLAY_RESOURCES.en,
        ...PROFILE_RESOURCES.en,
      },
      es: {
        ...APP_RESOURCES.es,
        ...GAME_RESOURCES.es,
        ...SCOREKEEPER_RESOURCES.es,
        ...HISTORY_RESOURCES.es,
        ...SETTINGS_RESOURCES.es,
        ...ONLINE_RESOURCES.es,
        ...HOW_TO_PLAY_RESOURCES.es,
        ...PROFILE_RESOURCES.es,
      },
    },
  });
}
