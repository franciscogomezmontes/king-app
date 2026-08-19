/**
 * Scorekeeper mode's own "scorekeeper" i18n namespace. Hand-type names come from ui-kit's existing
 * "rules" namespace instead (reused, not duplicated) — see
 * packages/ui-kit/src/i18n/rulesResources.ts. Add new UI strings in English and Spanish together.
 */
export const SCOREKEEPER_RESOURCES = {
  en: {
    scorekeeper: {
      player: "Player {{number}}",
      hand: "Hand {{number}}/10",
      backToMenu: "Back to Menu",
      resume: {
        title: "Game in progress",
        body: "You have a Scorekeeper game already underway. Resume it, or start a new one?",
        resume: "Resume Game",
        startNew: "Start New Game",
      },
      setup: {
        title: "New Game",
        date: "Date",
        namesHint: "Names are optional — leave blank to keep \"Player N.\"",
        start: "Start",
      },
      // Phrased as an explicit question per hand, not just a bare label — so there's never any
      // doubt about whether to enter a card count, a trick count, or points (the family's own
      // concern: "no hay confusión sobre si la persona debe anotar número de corazones o puntaje").
      question: {
        noTricks: "How many Tricks did each Player win?",
        noHearts: "How many Hearts did each Player win?",
        noGentlemen: "How many Kings & Jacks did each Player win?",
        noLady: "How many Queens did each Player win?",
        // Only one King of Hearts exists — asking "how many" per player reads oddly for a
        // single, all-or-nothing card. Entry is still one field per player (1 for whoever won
        // it, 0 for the rest), the question just asks it the way a person actually would.
        noKingOfHearts: "Who captured the King of Hearts?",
        noLastTwo: "How many of the last 2 tricks did each Player win?",
        positive: "How many Tricks did each Player win?",
      },
      validation: {
        ok: "OK",
        mismatch: "Doesn't add up — should total {{expected}}",
      },
      direction: {
        prompt: "Direction",
      },
      confirmHand: "Confirm Hand",
      edit: {
        save: "Save Changes",
        cancel: "Cancel",
      },
      gameOver: "Game Over",
      newGame: "New Game",
      winner: "{{name}} wins!",
      tie: "Tied: {{names}}",
    },
  },
  es: {
    scorekeeper: {
      player: "Jugador {{number}}",
      hand: "Mano {{number}}/10",
      backToMenu: "Volver al Menú",
      resume: {
        title: "Partida en curso",
        body: "Ya tienes una partida de Anotador en curso. ¿Quieres continuarla o empezar una nueva?",
        resume: "Continuar Partida",
        startNew: "Empezar Nueva Partida",
      },
      setup: {
        title: "Nueva Partida",
        date: "Fecha",
        namesHint: "Los nombres son opcionales — déjalos en blanco para usar \"Jugador N.\"",
        start: "Comenzar",
      },
      question: {
        noTricks: "¿Cuántas Bazas ganó cada Jugador?",
        noHearts: "¿Cuántos Corazones ganó cada Jugador?",
        noGentlemen: "¿Cuántos Reyes y Jotas ganó cada Jugador?",
        noLady: "¿Cuántas Damas ganó cada Jugador?",
        noKingOfHearts: "¿Quién se llevó el Rey de Corazones?",
        noLastTwo: "¿Cuántas de las últimas 2 bazas ganó cada Jugador?",
        positive: "¿Cuántas Bazas ganó cada Jugador?",
      },
      validation: {
        ok: "OK",
        mismatch: "Revisar, NO suma {{expected}}",
      },
      direction: {
        prompt: "Dirección",
      },
      confirmHand: "Confirmar Mano",
      edit: {
        save: "Guardar Cambios",
        cancel: "Cancelar",
      },
      gameOver: "Fin del Juego",
      newGame: "Nueva Partida",
      winner: "¡{{name}} gana!",
      tie: "Empate: {{names}}",
    },
  },
};
