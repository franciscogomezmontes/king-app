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
  },
};
