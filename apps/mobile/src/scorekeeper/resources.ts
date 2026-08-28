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
      count: {
        decrease: "Decrease {{name}}'s count",
        increase: "Increase {{name}}'s count",
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
      count: {
        decrease: "Disminuir cantidad de {{name}}",
        increase: "Aumentar cantidad de {{name}}",
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
  fr: {
    scorekeeper: {
      player: "Joueur {{number}}",
      hand: "Main {{number}}/10",
      backToMenu: "Retour au Menu",
      resume: {
        title: "Partie en cours",
        body: "Tu as déjà une partie de Marqueur en cours. La reprendre, ou en commencer une nouvelle ?",
        resume: "Reprendre la Partie",
        startNew: "Commencer une Nouvelle Partie",
      },
      setup: {
        title: "Nouvelle Partie",
        date: "Date",
        namesHint: "Les noms sont facultatifs — laisse vide pour garder « Joueur N ».",
        start: "Commencer",
      },
      question: {
        noTricks: "Combien de Levées chaque Joueur a-t-il remportées ?",
        noHearts: "Combien de Cœurs chaque Joueur a-t-il remportés ?",
        noGentlemen: "Combien de Rois et Valets chaque Joueur a-t-il remportés ?",
        noLady: "Combien de Dames chaque Joueur a-t-il remportées ?",
        noKingOfHearts: "Qui a remporté le Roi de Cœur ?",
        noLastTwo: "Combien des 2 dernières levées chaque Joueur a-t-il remportées ?",
        positive: "Combien de Levées chaque Joueur a-t-il remportées ?",
      },
      count: {
        decrease: "Diminuer le nombre de {{name}}",
        increase: "Augmenter le nombre de {{name}}",
      },
      validation: {
        ok: "OK",
        mismatch: "Ça ne tombe pas juste — le total devrait être {{expected}}",
      },
      direction: {
        prompt: "Direction",
      },
      confirmHand: "Confirmer la Main",
      edit: {
        save: "Enregistrer les Modifications",
        cancel: "Annuler",
      },
      gameOver: "Fin de la Partie",
      newGame: "Nouvelle Partie",
      winner: "{{name}} gagne !",
      tie: "Égalité : {{names}}",
    },
  },
  de: {
    scorekeeper: {
      player: "Spieler {{number}}",
      hand: "Hand {{number}}/10",
      backToMenu: "Zurück zum Menü",
      resume: {
        title: "Spiel in Bearbeitung",
        body: "Du hast bereits ein laufendes Punktezähler-Spiel. Fortsetzen, oder ein neues starten?",
        resume: "Spiel Fortsetzen",
        startNew: "Neues Spiel Starten",
      },
      setup: {
        title: "Neues Spiel",
        date: "Datum",
        namesHint: "Namen sind optional — leer lassen, um „Spieler N“ zu verwenden.",
        start: "Starten",
      },
      question: {
        noTricks: "Wie viele Stiche hat jeder Spieler gewonnen?",
        noHearts: "Wie viele Herzen hat jeder Spieler gewonnen?",
        noGentlemen: "Wie viele Könige und Buben hat jeder Spieler gewonnen?",
        noLady: "Wie viele Damen hat jeder Spieler gewonnen?",
        noKingOfHearts: "Wer hat den Herzkönig bekommen?",
        noLastTwo: "Wie viele der letzten 2 Stiche hat jeder Spieler gewonnen?",
        positive: "Wie viele Stiche hat jeder Spieler gewonnen?",
      },
      count: {
        decrease: "Anzahl von {{name}} verringern",
        increase: "Anzahl von {{name}} erhöhen",
      },
      validation: {
        ok: "OK",
        mismatch: "Stimmt nicht — sollte {{expected}} ergeben",
      },
      direction: {
        prompt: "Richtung",
      },
      confirmHand: "Hand Bestätigen",
      edit: {
        save: "Änderungen Speichern",
        cancel: "Abbrechen",
      },
      gameOver: "Spiel Beendet",
      newGame: "Neues Spiel",
      winner: "{{name}} gewinnt!",
      tie: "Unentschieden: {{names}}",
    },
  },
};
