/**
 * The app's supported UI languages. Every namespace under src/i18n/resources must provide a
 * complete translation for each of these — see rulesResources.ts for how that's enforced at the
 * type level.
 */
export const SUPPORTED_LOCALES = ["en", "es"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "es";

function isSupportedLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/**
 * Picks the first supported locale out of a device's ordered language preferences (e.g. from
 * `expo-localization`'s `getLocales()`, mapped to BCP-47 tags like "es-CO" or "en-US"), falling
 * back to `DEFAULT_LOCALE` if none of the device's languages are supported yet. Only the
 * language subtag is matched — region ("es-CO" vs "es-ES") doesn't affect which UI strings are
 * shown, since this app doesn't have per-region translations.
 */
export function resolveSupportedLocale(deviceLanguageTags: readonly string[]): Locale {
  for (const tag of deviceLanguageTags) {
    const language = tag.split("-")[0].toLowerCase();
    if (isSupportedLocale(language)) return language;
  }
  return DEFAULT_LOCALE;
}
