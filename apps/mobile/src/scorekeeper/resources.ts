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
        noKingOfHearts: "Who took K♥?",
        noLastTwo: "Of the last two tricks",
        positive: "Tricks captured",
      },
      validation: {
        ok: "Adds up to {{expected}}",
        remaining: "{{count}} left to assign",
        mismatch: "Over by {{count}} — should sum to {{expected}}",
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
      backToMenu: "Volver al menú",
      resume: {
        title: "Partida en curso",
        body: "Ya tienes una partida de Anotador en curso. ¿Quieres continuarla o empezar una nueva?",
        resume: "Continuar partida",
        startNew: "Empezar nueva",
      },
      unitLabel: {
        noTricks: "Bazas capturadas",
        noHearts: "Corazones capturados",
        noGentlemen: "Reyes y jotas capturados",
        noLady: "Damas capturadas",
        noKingOfHearts: "¿Quién se llevó el K♥?",
        noLastTwo: "De las dos últimas bazas",
        positive: "Bazas capturadas",
      },
      validation: {
        ok: "Suma {{expected}}",
        remaining: "Faltan {{count}}",
        mismatch: "Se pasa por {{count}} — debe sumar {{expected}}",
      },
      direction: {
        prompt: "Dirección",
      },
      confirmHand: "Confirmar mano",
      nextHand: "Siguiente mano",
      gameOver: "Fin del juego",
      newGame: "Nueva partida",
      winner: "¡{{name}} gana!",
      tie: "Empate: {{names}}",
    },
  },
};
