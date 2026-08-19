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
      pitch: "King, the way it's always been played",
      modes: {
        resumeSolo: "Resume Game",
        resumeSoloHint: "Continue your unfinished Solo vs Computer game.",
        scorekeeper: "Scorekeeper",
        scorekeeperHint: "Keep score for a table with physical cards.",
        solo: "Solo vs Computer",
        soloHint: "Play a full game against three club opponents.",
        online: "Online",
        onlineHint: "Host or join a game with friends on the same WiFi network.",
        historyHint: "Every finished game, physical or against the house.",
      },
      language: "Language",
    },
  },
  es: {
    app: {
      title: "KING",
      tagline: "Mesa de club",
      pitch: "El King de toda la vida",
      modes: {
        resumeSolo: "Continuar Partida",
        resumeSoloHint: "Continúa tu partida de Solo vs Computadora sin terminar.",
        scorekeeper: "Anotador",
        scorekeeperHint: "Anota una mesa con cartas físicas.",
        solo: "Solo contra la computadora",
        soloHint: "Juega una partida completa contra tres rivales del club.",
        online: "En Línea",
        onlineHint: "Crea o únete a una partida con amigos en la misma red WiFi.",
        historyHint: "Cada partida terminada, física o contra la casa.",
      },
      language: "Idioma",
    },
  },
};
