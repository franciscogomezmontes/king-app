import i18next, { type i18n as I18nInstance, type Resource } from "i18next";
import { initReactI18next } from "react-i18next";
import { DEFAULT_LOCALE, Locale, SUPPORTED_LOCALES } from "./locale";
import { RULES_LABELS } from "./rulesResources";

export interface CreateI18nOptions {
  /** The locale to start in — typically the output of resolveSupportedLocale(). */
  locale: Locale;
  /**
   * Extra namespaces the calling app wants merged in alongside ui-kit's own "rules" namespace,
   * shaped the way i18next expects: `{ [locale]: { [namespace]: { ...keys } } }`.
   */
  resources?: Resource;
}

/**
 * Creates a standalone i18next instance (not the shared global singleton, so multiple apps in
 * this monorepo can each own their instance) pre-loaded with ui-kit's "rules" namespace — see
 * rulesResources.ts. Callers merge in their own app-specific namespaces via `resources`.
 */
export function createI18n({ locale, resources = {} }: CreateI18nOptions): I18nInstance {
  const instance = i18next.createInstance();

  const merged: Resource = {};
  for (const l of SUPPORTED_LOCALES) {
    merged[l] = { rules: RULES_LABELS[l] as unknown as Record<string, unknown> };
  }
  for (const [l, namespaces] of Object.entries(resources)) {
    merged[l] = { ...merged[l], ...namespaces };
  }

  instance.use(initReactI18next).init({
    resources: merged,
    lng: locale,
    fallbackLng: DEFAULT_LOCALE,
    // Resources are supplied in-memory up front (no async backend fetch), and content isn't
    // HTML, so neither Suspense nor i18next's HTML-escaping is needed here.
    react: { useSuspense: false },
    interpolation: { escapeValue: false },
  });

  return instance;
}
