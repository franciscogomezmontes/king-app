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
  fr: {
    app: {
      title: "KING",
      tagline: "Table de club",
      pitch: "Le King comme on l'a toujours joué",
      modes: {
        resumeSolo: "Reprendre la Partie",
        resumeSoloHint: "Continuez votre partie Solo contre l'Ordinateur non terminée.",
        scorekeeper: "Marqueur",
        scorekeeperHint: "Tenez le score d'une table avec des cartes physiques.",
        solo: "Solo contre l'Ordinateur",
        soloHint: "Jouez une partie complète contre trois adversaires du club.",
        online: "En Ligne",
        onlineHint: "Créez ou rejoignez une partie avec des amis sur le même réseau WiFi.",
        historyHint: "Chaque partie terminée, physique ou contre l'ordinateur.",
      },
      language: "Langue",
    },
  },
  de: {
    app: {
      title: "KING",
      tagline: "Klubtisch",
      pitch: "King, wie man es schon immer gespielt hat",
      modes: {
        resumeSolo: "Spiel Fortsetzen",
        resumeSoloHint: "Setze dein unvollendetes Spiel Solo gegen den Computer fort.",
        scorekeeper: "Punktezähler",
        scorekeeperHint: "Führe die Punkte für einen Tisch mit physischen Karten.",
        solo: "Solo gegen den Computer",
        soloHint: "Spiele eine komplette Partie gegen drei Klubgegner.",
        online: "Online",
        onlineHint: "Erstelle oder tritt einem Spiel mit Freunden im selben WLAN bei.",
        historyHint: "Jedes beendete Spiel, physisch oder gegen den Computer.",
      },
      language: "Sprache",
    },
  },
};
