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
  fr: {
    history: {
      title: "Historique des Parties",
      empty: "Aucune partie terminée pour l'instant.",
      modeLabel: {
        scorekeeper: "Marqueur",
        solo: "Solo contre l'Ordinateur",
        online: "En Ligne",
      },
      winner: "{{name}} a gagné",
      tie: "Égalité : {{names}}",
      back: "Retour",
      backToMenu: "Retour au Menu",
      confirmDelete: "Supprimer cette partie ? Action irréversible.",
      confirmClearAll: "Supprimer toutes les parties enregistrées ? Action irréversible.",
      deleteConfirm: "Supprimer",
      deleteCancel: "Annuler",
      clearAll: "Effacer Tout l'Historique",
    },
  },
  de: {
    history: {
      title: "Spielverlauf",
      empty: "Noch keine abgeschlossenen Spiele.",
      modeLabel: {
        scorekeeper: "Punktezähler",
        solo: "Solo gegen den Computer",
        online: "Online",
      },
      winner: "{{name}} hat gewonnen",
      tie: "Unentschieden: {{names}}",
      back: "Zurück",
      backToMenu: "Zurück zum Menü",
      confirmDelete: "Dieses Spiel löschen? Das kann nicht rückgängig gemacht werden.",
      confirmClearAll: "Alle gespeicherten Spiele löschen? Das kann nicht rückgängig gemacht werden.",
      deleteConfirm: "Löschen",
      deleteCancel: "Abbrechen",
      clearAll: "Gesamten Verlauf Löschen",
    },
  },
};
