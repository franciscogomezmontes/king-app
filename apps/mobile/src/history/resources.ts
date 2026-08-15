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
        online: "Online",
      },
      winner: "{{name}} won",
      tie: "Tied: {{names}}",
      back: "Back",
      backToMenu: "Back to Menu",
      confirmDelete: "Delete this game? This can't be undone.",
      confirmClearAll: "Delete every saved game? This can't be undone.",
      deleteConfirm: "Delete",
      deleteCancel: "Cancel",
      clearAll: "Clear All History",
    },
  },
  es: {
    history: {
      title: "Historial de Partidas",
      empty: "Aún no hay partidas completadas.",
      modeLabel: {
        scorekeeper: "Anotador",
        solo: "Solo vs Computadora",
        online: "En Línea",
      },
      winner: "Ganó {{name}}",
      tie: "Empate: {{names}}",
      back: "Volver",
      backToMenu: "Volver al Menú",
      confirmDelete: "¿Borrar esta partida? No se puede deshacer.",
      confirmClearAll: "¿Borrar todas las partidas guardadas? No se puede deshacer.",
      deleteConfirm: "Borrar",
      deleteCancel: "Cancelar",
      clearAll: "Borrar Todo el Historial",
    },
  },
};
