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
  fr: {
    howToPlay: {
      title: "Comment Jouer au King",
      intro:
        "L'idée : le King se joue en dix mains. Sur les six premières, tu essaies d'éviter certaines cartes. Sur les quatre dernières, tu essaies de remporter des levées. Celui qui a le plus de points après les dix mains gagne.",
      basics:
        "Les bases : quatre joueurs, un jeu standard de 52 cartes, 13 cartes chacun. À chaque levée, le joueur après le donneur entame avec une carte, et tous les autres doivent fournir la couleur demandée s'ils le peuvent — sinon, ils peuvent jouer n'importe quelle carte. Celui qui joue la carte la plus haute de la couleur demandée remporte la levée (sauf s'il y a un atout en jeu, auquel cas l'atout le plus haut gagne). Les as sont hauts.",
      avoidHeading: "Les six premières mains — évite ceci :",
      avoidList: [
        "Pas de Levées — perds 20 points pour chaque levée remportée.",
        "Pas de Cœurs — perds 20 points pour chaque cœur capturé.",
        "Pas de Valets ni Rois — perds 30 points pour chaque roi ou valet capturé.",
        "Pas de Dames — perds 50 points pour chaque dame capturée.",
        "Pas de Roi de Cœur — perds 160 points si tu captures le Roi de Cœur.",
        "Pas des Deux Dernières — perds 90 points pour chacune des deux dernières levées remportées.",
      ],
      heartsNote:
        "Une règle en plus pour les mains Cœurs et Roi de Cœur : tu ne peux pas entamer avec un cœur, sauf si c'est la seule couleur qu'il te reste en main.",
      tricksHeading: "Les quatre dernières mains — maintenant, remporte des levées :",
      tricksBody:
        "Fini d'éviter les cartes — ces mains consistent à capturer autant de levées que possible. Avant chacune, le donneur nomme un atout, choisit de jouer sans atout, ou met ce choix aux enchères entre les trois autres joueurs (celui qui enchérit le plus grand nombre de levées gagne le droit de nommer l'atout — et cette enchère est soustraite de son compte de levées et ajoutée à celui du donneur). Chaque levée remportée vaut 25 points.",
      winning:
        "Pour gagner : additionne les dix mains. Le total le plus élevé gagne. (Anecdote : le calcul est toujours équilibré — les six mains à pénalité totalisent exactement −1300 points pour toute la table, et les quatre mains à levées totalisent exactement +1300, donc une partie terminée donne toujours zéro.)",
      outro:
        "Envie de changer un peu la donne ? Consulte les Règles Alternatives pour personnaliser la façon dont les quatre dernières mains se jouent.",
      backToSettings: "Retour aux Réglages",
    },
  },
  de: {
    howToPlay: {
      title: "Wie Man King Spielt",
      intro:
        "Die Idee: King wird über zehn Hände gespielt. Bei den ersten sechs versuchst du, bestimmte Karten zu vermeiden. Bei den letzten vier versuchst du, Stiche zu gewinnen. Wer nach allen zehn Händen die meisten Punkte hat, gewinnt.",
      basics:
        "Die Grundlagen: Vier Spieler, ein Standard-52-Karten-Blatt, je 13 Karten. Bei jedem Stich spielt der Spieler nach dem Geber eine Karte an, und alle anderen müssen die Farbe bedienen, wenn sie können — wenn nicht, dürfen sie eine beliebige Karte spielen. Wer die höchste Karte der angespielten Farbe spielt, gewinnt den Stich (außer es ist Trumpf im Spiel, dann gewinnt der höchste Trumpf). Asse sind hoch.",
      avoidHeading: "Die ersten sechs Hände — vermeide diese:",
      avoidList: [
        "Keine Stiche — verliere 20 Punkte für jeden gewonnenen Stich.",
        "Keine Herzen — verliere 20 Punkte für jedes eroberte Herz.",
        "Keine Buben und Könige — verliere 30 Punkte für jeden eroberten König oder Buben.",
        "Keine Damen — verliere 50 Punkte für jede eroberte Dame.",
        "Kein Herzkönig — verliere 160 Punkte, wenn du den Herzkönig eroberst.",
        "Keine Letzten Zwei — verliere 90 Punkte für jeden der letzten zwei gewonnenen Stiche.",
      ],
      heartsNote:
        "Eine zusätzliche Regel für die Herzen- und Herzkönig-Hände: Du darfst kein Herz anspielen, außer es ist die einzige Farbe, die dir noch übrig bleibt.",
      tricksHeading: "Die letzten vier Hände — jetzt gilt es, Stiche zu gewinnen:",
      tricksBody:
        "Kein Vermeiden mehr — bei diesen Händen geht es darum, so viele Stiche wie möglich zu machen. Vor jeder Hand sagt der Geber entweder eine Trumpffarbe an, entscheidet sich für „ohne Trumpf“, oder versteigert diese Entscheidung an die anderen drei Spieler (wer die höchste Anzahl an Stichen bietet, gewinnt das Recht, Trumpf anzusagen — und dieses Gebot wird von seiner Stichzahl abgezogen und der des Gebers hinzugefügt). Jeder gewonnene Stich ist 25 Punkte wert.",
      winning:
        "Gewinnen: Addiere alle zehn Hände. Die höchste Gesamtsumme gewinnt. (Interessante Tatsache: Die Rechnung geht immer auf — die sechs Straf-Hände ergeben zusammen genau −1300 Punkte für den ganzen Tisch, und die vier Stich-Hände ergeben zusammen genau +1300, sodass ein beendetes Spiel immer null ergibt.)",
      outro:
        "Lust, etwas zu ändern? Schau dir die Alternativen Regeln an, um anzupassen, wie die letzten vier Hände gespielt werden.",
      backToSettings: "Zurück zu den Einstellungen",
    },
  },
};
