/**
 * Mobile app's own "app" i18n namespace — screen chrome that isn't tied to rules-engine
 * identifiers (that content lives in ui-kit's "rules" namespace instead, see
 * packages/ui-kit/src/i18n/rulesResources.ts). Add new UI copy here in both locales together so
 * neither language ever falls behind.
 */
export const APP_RESOURCES = {
  en: {
    app: {
      title: "King",
      tagline: "Rey · Club table",
      pitch: "Ten hands. Four players. Score a physical table, or sit against the house.",
      modes: {
        scorekeeper: "Scorekeeper",
        scorekeeperHint: "Keep score for a table with physical cards.",
        solo: "Solo vs Computer",
        soloHint: "Play a full game against three club opponents.",
      },
      language: "Language",
    },
  },
  es: {
    app: {
      title: "Rey",
      tagline: "King · Mesa de club",
      pitch: "Diez manos. Cuatro jugadores. Anota una mesa real, o siéntate contra la casa.",
      modes: {
        scorekeeper: "Anotador",
        scorekeeperHint: "Anota una mesa con cartas físicas.",
        solo: "Solo contra la computadora",
        soloHint: "Juega una partida completa contra tres rivales del club.",
      },
      language: "Idioma",
    },
  },
};
