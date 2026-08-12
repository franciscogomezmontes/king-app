/**
 * The "game" i18n namespace — GameScreen's own copy. Hand-type and alt-rule-toggle labels come
 * from ui-kit's existing "rules" namespace instead (reused, not duplicated) — see
 * packages/ui-kit/src/i18n/rulesResources.ts.
 */
export const GAME_RESOURCES = {
  en: {
    game: {
      you: "You",
      bot: "Bot {{number}}",
      yourTurn: "Your turn",
      waiting: "Waiting for {{name}}…",
      dealer: "Dealer",
      trump: {
        prompt: "Choose trump",
        noTrump: "No Trump",
        openAuction: "Open Auction",
        declare: "Declare",
      },
      auction: {
        currentBid: "Current bid: {{tricks}}",
        noBids: "No bids yet",
        bidPrompt: "Your bid (tricks)",
        bid: "Bid",
        pass: "Pass",
        dealerPrompt: "Accept the bid of {{tricks}}?",
        sell: "Accept",
        keep: "Keep trump for myself",
      },
      auctionSummary: {
        declared: "{{name}} named trump directly",
        won: "{{name}} won the auction ({{tricks}} tricks)",
        trump: "Trump",
      },
      backToMenu: "Back to Menu",
      gameOver: "Game Over",
      difficulty: {
        label: "Difficulty",
        easy: "Easy",
        normal: "Normal",
      },
      start: "Start Game",
      handComplete: {
        title: "Hand {{number}} Complete",
        continue: "Continue",
      },
      scoreboard: {
        total: "Total",
        negativeSubtotal: "Negative Subtotal",
        positiveSubtotal: "Positive Subtotal",
        winner: "{{name}} wins!",
        tie: "Tied: {{names}}",
        rule: {
          noTricks: "-20/trick",
          noHearts: "-20/heart",
          noGentlemen: "-30/card",
          noLady: "-50/card",
          noKingOfHearts: "-160",
          noLastTwo: "-90 x2",
          positiveUp: "+25/trick",
          positiveDown: "325-75/trick",
        },
      },
    },
  },
  es: {
    game: {
      you: "Tú",
      bot: "Bot {{number}}",
      yourTurn: "Tu turno",
      waiting: "Esperando a {{name}}…",
      dealer: "Repartidor",
      trump: {
        prompt: "Elige el triunfo",
        noTrump: "Sin Triunfo",
        openAuction: "Abrir Subasta",
        declare: "Declarar",
      },
      auction: {
        currentBid: "Puja actual: {{tricks}}",
        noBids: "Aún no hay pujas",
        bidPrompt: "Tu puja (bazas)",
        bid: "Pujar",
        pass: "Pasar",
        dealerPrompt: "¿Aceptar la puja de {{tricks}}?",
        sell: "Aceptar",
        keep: "Quedarme con el triunfo",
      },
      auctionSummary: {
        declared: "{{name}} nombró el triunfo directamente",
        won: "{{name}} ganó la subasta ({{tricks}} bazas)",
        trump: "Triunfo",
      },
      backToMenu: "Volver al Menú",
      gameOver: "Fin del Juego",
      difficulty: {
        label: "Dificultad",
        easy: "Fácil",
        normal: "Normal",
      },
      start: "Empezar Juego",
      handComplete: {
        title: "Mano {{number}} Completa",
        continue: "Continuar",
      },
      scoreboard: {
        total: "Total",
        negativeSubtotal: "Subtotal Negativo",
        positiveSubtotal: "Subtotal Positivo",
        winner: "¡{{name}} gana!",
        tie: "Empate: {{names}}",
        rule: {
          noTricks: "-20/baza",
          noHearts: "-20/corazón",
          noGentlemen: "-30/carta",
          noLady: "-50/carta",
          noKingOfHearts: "-160",
          noLastTwo: "-90 x2",
          positiveUp: "+25/baza",
          positiveDown: "325-75/baza",
        },
      },
    },
  },
};
