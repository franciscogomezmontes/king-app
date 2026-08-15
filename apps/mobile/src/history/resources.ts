/**
 * Game History's own "history" i18n namespace — a shared archive of finished games from both
 * Scorekeeper and Solo vs Computer. Add new UI strings in English and Spanish together.
 */
export const HISTORY_RESOURCES = {
  en: {
    history: {
      title: "Game History",
      empty: "No completed games yet.",
      modeLabel: {
        scorekeeper: "Scorekeeper",
        solo: "Solo vs Computer",
      },
      winner: "{{name}} won",
      tie: "Tied: {{names}}",
      back: "Back",
      backToMenu: "Back to Menu",
    },
  },
  es: {
    history: {
      title: "Historial de Partidas",
      empty: "Aún no hay partidas completadas.",
      modeLabel: {
        scorekeeper: "Anotador",
        solo: "Solo vs Computadora",
      },
      winner: "Ganó {{name}}",
      tie: "Empate: {{names}}",
      back: "Volver",
      backToMenu: "Volver al Menú",
    },
  },
};
