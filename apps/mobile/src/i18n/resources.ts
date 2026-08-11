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
      subtitle: "rules-engine wired up — deck has {{count}} cards",
      phase: "Phase {{number}}",
      phaseLater: "Phase {{number}} (later)",
      modes: {
        scorekeeper: "Scorekeeper",
        solo: "Solo vs. Computer",
        local: "Local Pass-and-Play",
        online: "Online Multiplayer",
      },
      language: "Language",
    },
  },
  es: {
    app: {
      title: "King",
      subtitle: "rules-engine conectado — la baraja tiene {{count}} cartas",
      phase: "Fase {{number}}",
      phaseLater: "Fase {{number}} (más adelante)",
      modes: {
        scorekeeper: "Anotador",
        solo: "Solo contra la Computadora",
        local: "Pasar y Jugar (Local)",
        online: "Multijugador en Línea",
      },
      language: "Idioma",
    },
  },
};
