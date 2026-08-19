/**
 * "How to Play" screen's own i18n namespace — a plain-language rules explainer for players who
 * don't already know the game, reached from Settings. Add new copy here in both locales together.
 */
export const HOW_TO_PLAY_RESOURCES = {
  en: {
    howToPlay: {
      title: "How to Play King",
      intro:
        "The idea: King is played over ten hands. On the first six, you're trying to avoid certain cards. On the last four, you're trying to win tricks. Whoever has the most points after all ten hands wins.",
      basics:
        "The basics: Four players, a standard 52-card deck, 13 cards each. On each trick, the player after the dealer leads a card, and everyone else must follow suit if they can — if not, they can play anything. Whoever plays the highest card of the suit led wins the trick (unless there's a trump suit in play, in which case the highest trump wins). Aces are high.",
      avoidHeading: "The first six hands — avoid these:",
      avoidList: [
        "No Tricks — lose 20 points for every trick you win.",
        "No Hearts — lose 20 points for every heart you capture.",
        "No Gentlemen — lose 30 points for every king or jack you capture.",
        "No Lady — lose 50 points for every queen you capture.",
        "No King of Hearts — lose 160 points if you capture the King of Hearts.",
        "No Last Two — lose 90 points for each of the last two tricks you win.",
      ],
      heartsNote:
        "One extra rule for the Hearts and King of Hearts hands: you can't lead a heart unless it's the only suit left in your hand.",
      tricksHeading: "The last four hands — now go win tricks:",
      tricksBody:
        "No more avoiding — these hands are about capturing as many tricks as you can. Before each one, the dealer either names a trump suit, chooses to play with no trump, or auctions off that choice to the other three players (whoever bids the highest number of tricks wins the right to name trump — and that bid gets subtracted from their trick count and added to the dealer's). Every trick you win is worth 25 points.",
      winning:
        "Winning: Add up all ten hands. Highest total wins. (Fun fact: the math always balances — the six penalty hands add up to exactly −1,300 points across the table, and the four trick-taking hands add up to exactly +1,300, so a finished game always sums to zero.)",
      outro:
        "Looking to change things up? Check Alternative Rules to personalize how the last four hands are played.",
      backToSettings: "Back to Settings",
    },
  },
  es: {
    howToPlay: {
      title: "Cómo se juega King",
      intro:
        "La idea: King se juega en diez manos. En las primeras seis, el objetivo es evitar ciertas cartas. En las últimas cuatro, el objetivo es ganar bazas. Al final de las diez manos, gana quien tenga más puntos.",
      basics:
        "Lo básico: Cuatro jugadores, una baraja estándar de 52 cartas, 13 cartas por jugador. En cada baza, el jugador después del que reparte sale con una carta, y los demás deben jugar del mismo palo si pueden — si no tienen, pueden jugar cualquier carta. Gana la baza quien juegue la carta más alta del palo que salió (o la carta de triunfo más alta, si hay triunfo en juego). Los ases valen más que todo.",
      avoidHeading: "Las primeras seis manos — evita estas cartas:",
      avoidList: [
        "No Bazas — pierdes 20 puntos por cada baza que ganes.",
        "No Corazones — pierdes 20 puntos por cada corazón que captures.",
        "No J's & K's — pierdes 30 puntos por cada jota o rey que captures.",
        "No Q's — pierdes 50 puntos por cada dama que captures.",
        "No K de Corazones — pierdes 160 puntos si capturas el rey de corazones.",
        "No 2 últimas — pierdes 90 puntos por cada una de las últimas dos bazas que ganes.",
      ],
      heartsNote:
        "Una regla extra para las manos de Corazones y K de Corazones: no puedes salir con un corazón a menos que sea lo único que te quede en la mano.",
      tricksHeading: "Las últimas cuatro manos — ahora sí, a ganar bazas:",
      tricksBody:
        "Se acabó eso de evitar cartas — estas manos son para capturar todas las bazas que puedas. Antes de cada una, el que reparte decide: nombra un palo de triunfo, juega sin triunfo, o subasta esa decisión entre los otros tres jugadores (quien ofrezca el número más alto de bazas gana el derecho de nombrar el triunfo — y esa oferta se resta de su conteo de bazas y se suma al del que reparte). Cada baza que ganes vale 25 puntos.",
      winning:
        "Cómo se gana: Suma las diez manos. Gana quien tenga el puntaje más alto. (Dato curioso: la matemática siempre cuadra — las seis manos de penalización suman exactamente −1.300 puntos entre toda la mesa, y las cuatro manos de bazas suman exactamente +1.300, así que un juego completo siempre da cero.)",
      outro:
        "¿Quieres cambiar un poco las cosas? Revisa Reglas Alternativas para personalizar cómo se juegan las últimas cuatro manos.",
      backToSettings: "Volver a Ajustes",
    },
  },
};
