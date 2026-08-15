/**
 * Mobile app's own "app" i18n namespace — screen chrome that isn't tied to rules-engine
 * identifiers (that content lives in ui-kit's "rules" namespace instead, see
 * packages/ui-kit/src/i18n/rulesResources.ts). Add new UI copy here in both locales together so
 * neither language ever falls behind.
 */
export const APP_RESOURCES = {
  en: {
    app: {
      title: "KING",
      tagline: "Club table",
      pitch: "Ten hands. Four players. Score a physical table, or sit against the house.",
      modes: {
        scorekeeper: "Scorekeeper",
        scorekeeperHint: "Keep score for a table with physical cards.",
        solo: "Solo vs Computer",
        soloHint: "Play a full game against three club opponents.",
        online: "Online",
        onlineHint: "Host or join a game with friends on the same WiFi network.",
        historyHint: "Every finished game, physical or against the house.",
        settingsHint: "Card back style and other preferences.",
      },
      language: "Language",
    },
  },
  es: {
    app: {
      title: "KING",
      tagline: "Mesa de club",
      pitch: "Diez manos. Cuatro jugadores. Anota una mesa real, o siéntate contra la casa.",
      modes: {
        scorekeeper: "Anotador",
        scorekeeperHint: "Anota una mesa con cartas físicas.",
        solo: "Solo contra la computadora",
        soloHint: "Juega una partida completa contra tres rivales del club.",
        online: "En Línea",
        onlineHint: "Crea o únete a una partida con amigos en la misma red WiFi.",
        historyHint: "Cada partida terminada, física o contra la casa.",
        settingsHint: "Estilo del revés de las cartas y otras preferencias.",
      },
      language: "Idioma",
    },
  },
};
