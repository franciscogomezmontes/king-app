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
      unitLabel: {
        noTricks: "Tricks captured",
        noHearts: "Hearts captured",
        noGentlemen: "Kings & Jacks captured",
        noLady: "Queens captured",
        noKingOfHearts: "Captured K♥? (0 or 1)",
        noLastTwo: "Won of the last 2 tricks (0-2)",
        positive: "Tricks captured",
      },
      validation: {
        ok: "OK",
        mismatch: "Revisar, NO suma {{expected}}",
      },
      direction: {
        prompt: "Direction",
      },
      confirmHand: "Confirm Hand",
      nextHand: "Next Hand",
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
      unitLabel: {
        noTricks: "Bazas capturadas",
        noHearts: "Corazones capturados",
        noGentlemen: "Reyes y Jotas capturados",
        noLady: "Damas capturadas",
        noKingOfHearts: "¿Capturó el Rey de Corazones? (0 o 1)",
        noLastTwo: "Bazas ganadas de las últimas 2 (0-2)",
        positive: "Bazas capturadas",
      },
      validation: {
        ok: "OK",
        mismatch: "Revisar, NO suma {{expected}}",
      },
      direction: {
        prompt: "Dirección",
      },
      confirmHand: "Confirmar Mano",
      nextHand: "Siguiente Mano",
      gameOver: "Fin del Juego",
      newGame: "Nueva Partida",
      winner: "¡{{name}} gana!",
      tie: "Empate: {{names}}",
    },
  },
};
