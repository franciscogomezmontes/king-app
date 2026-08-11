import { NEGATIVE_HAND_ORDER } from "rules-engine";
import { describe, expect, it } from "vitest";
import { createI18n } from "../src/i18n/createI18n";
import { DEFAULT_LOCALE, resolveSupportedLocale, SUPPORTED_LOCALES } from "../src/i18n/locale";
import { RULES_LABELS, RuleToggleKey } from "../src/i18n/rulesResources";

describe("resolveSupportedLocale", () => {
  it("matches an exact supported language tag", () => {
    expect(resolveSupportedLocale(["es"])).toBe("es");
  });

  it("matches on the language subtag, ignoring region", () => {
    expect(resolveSupportedLocale(["es-CO"])).toBe("es");
    expect(resolveSupportedLocale(["en-US"])).toBe("en");
  });

  it("is case-insensitive", () => {
    expect(resolveSupportedLocale(["ES-co"])).toBe("es");
  });

  it("picks the first supported tag in an ordered preference list", () => {
    expect(resolveSupportedLocale(["fr-FR", "es-MX", "en-US"])).toBe("es");
  });

  it("falls back to DEFAULT_LOCALE when nothing is supported", () => {
    expect(resolveSupportedLocale(["fr-FR", "de-DE"])).toBe(DEFAULT_LOCALE);
    expect(resolveSupportedLocale([])).toBe(DEFAULT_LOCALE);
  });
});

describe("RULES_LABELS — translation completeness", () => {
  const ruleToggleKeys: RuleToggleKey[] = ["mandatoryKilling", "auctionMustSell", "backwards"];

  for (const locale of SUPPORTED_LOCALES) {
    describe(`locale "${locale}"`, () => {
      it("has a non-empty name and description for every negative hand type", () => {
        for (const handType of NEGATIVE_HAND_ORDER) {
          const label = RULES_LABELS[locale].negativeHands[handType];
          expect(label.name.length).toBeGreaterThan(0);
          expect(label.description.length).toBeGreaterThan(0);
        }
      });

      it("has a non-empty name and description for every boolean RuleSet toggle", () => {
        for (const key of ruleToggleKeys) {
          const label = RULES_LABELS[locale].ruleToggles[key];
          expect(label.name.length).toBeGreaterThan(0);
          expect(label.description.length).toBeGreaterThan(0);
        }
      });

      it("has non-empty positiveHand and playingDirection labels", () => {
        expect(RULES_LABELS[locale].positiveHand.name.length).toBeGreaterThan(0);
        expect(RULES_LABELS[locale].positiveHand.description.length).toBeGreaterThan(0);
        expect(RULES_LABELS[locale].playingDirection.up.length).toBeGreaterThan(0);
        expect(RULES_LABELS[locale].playingDirection.down.length).toBeGreaterThan(0);
      });
    });
  }
});

describe("createI18n", () => {
  it("serves the ui-kit 'rules' namespace in the requested locale", () => {
    const i18n = createI18n({ locale: "es" });
    expect(i18n.t("rules:negativeHands.noTricks.name")).toBe("No Bazas");
  });

  it("switches locales at runtime", async () => {
    const i18n = createI18n({ locale: "es" });
    await i18n.changeLanguage("en");
    expect(i18n.t("rules:negativeHands.noTricks.name")).toBe("No Tricks");
  });

  it("merges caller-supplied namespaces alongside the built-in 'rules' namespace", () => {
    const i18n = createI18n({
      locale: "en",
      resources: {
        en: { app: { title: "King" } },
        es: { app: { title: "King" } },
      },
    });
    expect(i18n.t("app:title")).toBe("King");
    expect(i18n.t("rules:positiveHand.name")).toBe("Trump Hand");
  });
});
