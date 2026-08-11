import * as Localization from "expo-localization";
import { createI18n, resolveSupportedLocale } from "ui-kit";
import { GAME_RESOURCES } from "../game/resources";
import { APP_RESOURCES } from "./resources";

export { DEFAULT_LOCALE, SUPPORTED_LOCALES, type Locale } from "ui-kit";

/**
 * Builds this app's i18next instance: detects the device's language preferences via
 * expo-localization, resolves the first one this app supports (falling back to English), and
 * merges in this app's own "app" and "game" namespaces alongside ui-kit's "rules" namespace.
 */
export function initI18n() {
  const deviceLanguageTags = Localization.getLocales().map((l) => l.languageTag);
  const locale = resolveSupportedLocale(deviceLanguageTags);
  return createI18n({
    locale,
    resources: {
      en: { ...APP_RESOURCES.en, ...GAME_RESOURCES.en },
      es: { ...APP_RESOURCES.es, ...GAME_RESOURCES.es },
    },
  });
}
