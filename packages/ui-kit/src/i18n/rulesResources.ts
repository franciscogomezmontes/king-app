import type { GameRules, NegativeHandType } from "rules-engine";
import type { Locale } from "./locale";

/**
 * Every `GameRules` field gets a standalone name/description here — this is the game-setup menu
 * a player configures once per game (CLAUDE.md principle 3), so it's keyed off `GameRules`, not
 * the per-computation `RuleSet`. All five fields happen to be plain booleans today, so this list
 * doubles as the settings screen's actual toggle list (`GAME_RULE_TOGGLE_KEYS` below) — deriving
 * both from `keyof GameRules` means a new toggle added to `GameRules` in rules-engine is both a
 * compile error here until it's translated for both locales, *and* automatically shows up as a
 * new row in Settings without any UI code changes.
 */
export type RuleToggleKey = keyof GameRules;

export const GAME_RULE_TOGGLE_KEYS: RuleToggleKey[] = [
  "mandatoryKilling",
  "auctionMustSell",
  "playingDownEnabled",
  "backwardsEnabled",
  "noFaceCardsRedealEnabled",
];

interface Labeled {
  name: string;
  description: string;
}

export interface RulesLabels {
  negativeHands: Record<NegativeHandType, Labeled>;
  positiveHand: Labeled;
  ruleToggles: Record<RuleToggleKey, Labeled>;
  playingDirection: Record<"up" | "down", string>;
  /** Accessible label for any "(i)" InfoTooltip badge in this app (a live hand's name in
   * ScorePanel.tsx, an alt-rule toggle in SettingsScreen.tsx, etc.) — takes whatever it's
   * labeling via `{{name}}` interpolation. */
  infoLabel: string;
  /** Per-locale card-rank letters (see PlayingCard.tsx) — Francisco's explicit request: English/
   * Spanish keep the familiar J/Q/K/A, but French and German use their own real-table
   * abbreviations (Valet/Dame/Roi/As and Bube/Dame/König/As respectively), not the English
   * letters transliterated. */
  rankLabels: { jack: string; queen: string; king: string; ace: string };
}

/**
 * Hand-type and alt-rule-toggle labels for the "rules" i18n namespace, typed against
 * rules-engine's real `NegativeHandType`/`RuleSet` identifiers (see RulesLabels above) so a
 * missing translation for either locale is a compile error, not a silent gap discovered by a
 * Spanish-speaking player mid-game.
 *
 * The Spanish negative-hand names are the family's own terms from `King Scorekeeper.xlsx`, given
 * directly by the user: No Bazas, No Corazones, No J's ni K's (Jotas y Reyes), No Q's (Damas),
 * No K de Corazones (Rey de Corazones), No 2 últimas.
 */
export const RULES_LABELS: Record<Locale, RulesLabels> = {
  en: {
    negativeHands: {
      noTricks: { name: "No Tricks", description: "Avoid capturing tricks — each one costs 20 points." },
      noHearts: { name: "No Hearts", description: "Avoid capturing hearts — each one costs 20 points." },
      noGentlemen: {
        name: "No Gentlemen",
        description: "Avoid capturing kings and jacks — each one costs 30 points.",
      },
      noLady: { name: "No Lady", description: "Avoid capturing queens — each one costs 50 points." },
      noKingOfHearts: {
        name: "No King of Hearts",
        description: "Avoid capturing the king of hearts — it costs 160 points.",
      },
      noLastTwo: {
        name: "No Last Two Tricks",
        description: "Avoid capturing either of the last two tricks — each one costs 90 points.",
      },
    },
    positiveHand: {
      name: "Trump Hand",
      description: "Capture as many tricks as you can — each one is worth 25 points by default.",
    },
    ruleToggles: {
      mandatoryKilling: {
        name: "Mandatory Killing",
        description:
          "You must beat the highest card of the led suit if you can, or trump if you can't follow suit.",
      },
      auctionMustSell: {
        name: "Auction Must Sell",
        description: "If the dealer opens an auction, they must accept the winning bid.",
      },
      playingDownEnabled: {
        name: "Playing Down",
        description:
          "Let the dealer choose to play a positive hand \"down\" (start at 325, lose points per trick) instead of always \"up\".",
      },
      backwardsEnabled: {
        name: "Backwards",
        description: "Whoever names trump can reverse card rank for the hand — 2 high, ace low.",
      },
      noFaceCardsRedealEnabled: {
        name: "No Face Cards Redeal",
        description:
          "A player dealt a positive hand with no J, Q, K, or A can ask for that hand to be redealt to everyone, as long as they haven't played their first card yet.",
      },
    },
    playingDirection: {
      up: "Playing Up",
      down: "Playing Down",
    },
    infoLabel: "About {{name}}",
    rankLabels: { jack: "J", queen: "Q", king: "K", ace: "A" },
  },
  es: {
    negativeHands: {
      noTricks: { name: "No Bazas", description: "Evita ganar bazas — cada una cuesta 20 puntos." },
      noHearts: { name: "No Corazones", description: "Evita ganar corazones — cada uno cuesta 20 puntos." },
      noGentlemen: {
        name: "No J's ni K's (Jotas y Reyes)",
        description: "Evita ganar jotas y reyes — cada uno cuesta 30 puntos.",
      },
      noLady: { name: "No Q's (Damas)", description: "Evita ganar damas — cada una cuesta 50 puntos." },
      noKingOfHearts: {
        name: "No K de Corazones (Rey de Corazones)",
        description: "Evita ganar el rey de corazones — cuesta 160 puntos.",
      },
      noLastTwo: {
        name: "No 2 últimas",
        description: "Evita ganar cualquiera de las dos últimas bazas — cada una cuesta 90 puntos.",
      },
    },
    positiveHand: {
      name: "Mano de Triunfo",
      description: "Gana tantas bazas como puedas — cada una vale 25 puntos por defecto.",
    },
    ruleToggles: {
      mandatoryKilling: {
        name: "Matar Obligatorio",
        description:
          "Debes superar la carta más alta del palo jugado si puedes, o triunfar si no puedes seguir el palo.",
      },
      auctionMustSell: {
        name: "Subasta Obligatoria",
        description: "Si el repartidor abre una subasta, debe aceptar la puja ganadora.",
      },
      playingDownEnabled: {
        name: "Jugar Hacia Abajo",
        description:
          "Permite que el repartidor elija jugar una mano positiva \"hacia abajo\" (empieza en 325 y pierde puntos por baza) en vez de siempre \"hacia arriba\".",
      },
      backwardsEnabled: {
        name: "Revés",
        description: "Quien nombra el triunfo puede invertir el orden de las cartas en la mano — el 2 es la más alta y el as la más baja.",
      },
      noFaceCardsRedealEnabled: {
        name: "Cambio de Juego (Sin Figuras)",
        description:
          "Un jugador al que le reparten una mano positiva sin J, Q, K ni As puede pedir que se reparta esa mano de nuevo a todos, mientras no haya jugado aún su primera carta.",
      },
    },
    playingDirection: {
      up: "Jugando Hacia Arriba",
      down: "Jugando Hacia Abajo",
    },
    infoLabel: "Acerca de {{name}}",
    rankLabels: { jack: "J", queen: "Q", king: "K", ace: "A" },
  },
  fr: {
    negativeHands: {
      noTricks: { name: "Pas de Levées", description: "Évitez de remporter des levées — chacune coûte 20 points." },
      noHearts: { name: "Pas de Cœurs", description: "Évitez de remporter des cœurs — chacun coûte 20 points." },
      noGentlemen: {
        name: "Pas de Valets ni Rois",
        description: "Évitez de remporter rois et valets — chacun coûte 30 points.",
      },
      noLady: { name: "Pas de Dames", description: "Évitez de remporter des dames — chacune coûte 50 points." },
      noKingOfHearts: {
        name: "Pas de Roi de Cœur",
        description: "Évitez de remporter le roi de cœur — il coûte 160 points.",
      },
      noLastTwo: {
        name: "Pas des Deux Dernières Levées",
        description: "Évitez de remporter l'une des deux dernières levées — chacune coûte 90 points.",
      },
    },
    positiveHand: {
      name: "Main d'Atout",
      description: "Remportez autant de levées que possible — chacune vaut 25 points par défaut.",
    },
    ruleToggles: {
      mandatoryKilling: {
        name: "Obligation de Couper",
        description:
          "Vous devez battre la carte la plus haute de la couleur demandée si possible, ou couper si vous ne pouvez pas suivre.",
      },
      auctionMustSell: {
        name: "Vente Obligatoire aux Enchères",
        description: "Si le donneur ouvre une enchère, il doit accepter l'offre gagnante.",
      },
      playingDownEnabled: {
        name: "Jouer à la Baisse",
        description:
          "Permet au donneur de choisir de jouer une main positive « à la baisse » (commence à 325, perd des points par levée) au lieu de toujours « à la hausse ».",
      },
      backwardsEnabled: {
        name: "Inversé",
        description: "Celui qui nomme l'atout peut inverser l'ordre des cartes pour la main — le 2 est haut, l'as est bas.",
      },
      noFaceCardsRedealEnabled: {
        name: "Redistribution Sans Figures",
        description:
          "Un joueur qui reçoit une main positive sans Valet, Dame, Roi ni As peut demander que cette main soit redistribuée à tous, tant qu'il n'a pas encore joué sa première carte.",
      },
    },
    playingDirection: {
      up: "Jouer à la Hausse",
      down: "Jouer à la Baisse",
    },
    infoLabel: "À propos de {{name}}",
    rankLabels: { jack: "V", queen: "D", king: "R", ace: "A" },
  },
  de: {
    negativeHands: {
      noTricks: { name: "Keine Stiche", description: "Vermeide es, Stiche zu machen — jeder kostet 20 Punkte." },
      noHearts: { name: "Keine Herzen", description: "Vermeide es, Herzen zu gewinnen — jedes kostet 20 Punkte." },
      noGentlemen: {
        name: "Keine Buben und Könige",
        description: "Vermeide es, Könige und Buben zu gewinnen — jeder kostet 30 Punkte.",
      },
      noLady: { name: "Keine Damen", description: "Vermeide es, Damen zu gewinnen — jede kostet 50 Punkte." },
      noKingOfHearts: {
        name: "Kein Herzkönig",
        description: "Vermeide es, den Herzkönig zu gewinnen — er kostet 160 Punkte.",
      },
      noLastTwo: {
        name: "Keine Letzten Zwei Stiche",
        description: "Vermeide es, einen der letzten zwei Stiche zu gewinnen — jeder kostet 90 Punkte.",
      },
    },
    positiveHand: {
      name: "Trumpfhand",
      description: "Mache so viele Stiche wie möglich — jeder ist standardmäßig 25 Punkte wert.",
    },
    ruleToggles: {
      mandatoryKilling: {
        name: "Stichzwang",
        description:
          "Du musst die höchste Karte der angespielten Farbe schlagen, wenn möglich, oder stechen, wenn du nicht bedienen kannst.",
      },
      auctionMustSell: {
        name: "Verkaufszwang bei der Auktion",
        description: "Wenn der Geber eine Auktion eröffnet, muss er das Höchstgebot annehmen.",
      },
      playingDownEnabled: {
        name: "Abwärts Spielen",
        description:
          "Erlaubt dem Geber, eine positive Hand „abwärts“ zu spielen (beginnt bei 325, verliert Punkte pro Stich) statt immer „aufwärts“.",
      },
      backwardsEnabled: {
        name: "Umgekehrt",
        description: "Wer Trumpf ansagt, kann die Kartenreihenfolge für die Hand umkehren — die 2 ist hoch, das Ass ist niedrig.",
      },
      noFaceCardsRedealEnabled: {
        name: "Neuverteilung ohne Bildkarten",
        description:
          "Ein Spieler, der eine positive Hand ohne Bube, Dame, König oder Ass erhält, kann verlangen, dass diese Hand neu an alle ausgeteilt wird, solange er seine erste Karte noch nicht gespielt hat.",
      },
    },
    playingDirection: {
      up: "Aufwärts Spielen",
      down: "Abwärts Spielen",
    },
    infoLabel: "Über {{name}}",
    rankLabels: { jack: "B", queen: "D", king: "K", ace: "A" },
  },
};
