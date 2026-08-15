/**
 * Settings screen's own "settings" i18n namespace. Add new UI strings in English and Spanish
 * together.
 */
export const SETTINGS_RESOURCES = {
  en: {
    settings: {
      title: "Settings",
      backToMenu: "Back to Menu",
      howToPlay: {
        button: "How to Play",
      },
      cardBack: {
        title: "Card Back",
        hint: "Choose how opponents' hidden cards look in Solo vs Computer.",
        lattice: "Lattice",
        rings: "Rings",
        frame: "Frame",
      },
      gameRules: {
        title: "Game Rules",
        hint: "Set these once — they apply to every new Solo vs Computer game, and prefill an Online room's rules when you host (still adjustable per room). More rules will show up here as they're added.",
      },
      history: {
        title: "Game History",
        hint: "Whether finishing a game saves it to Game History. You can still delete individual games or clear everything from the History screen either way.",
        toggleName: "Save Game History",
        toggleDescription: "Off means new finished games won't be saved — this doesn't delete anything already there.",
      },
    },
  },
  es: {
    settings: {
      title: "Ajustes",
      backToMenu: "Volver al Menú",
      howToPlay: {
        button: "Cómo se Juega",
      },
      cardBack: {
        title: "Revés de las Cartas",
        hint: "Elige cómo se ven las cartas ocultas de los rivales en Solo vs Computadora.",
        lattice: "Rombos",
        rings: "Anillos",
        frame: "Marco",
      },
      gameRules: {
        title: "Reglas del Juego",
        hint: "Se configuran una vez — aplican a cada partida nueva de Solo vs Computadora, y son el punto de partida de las reglas cuando creás una sala En Línea (igual se pueden ajustar por sala). Más reglas irán apareciendo aquí a medida que se agreguen.",
      },
      history: {
        title: "Historial de Partidas",
        hint: "Si al terminar una partida se guarda en el Historial. De todas formas podés borrar partidas individuales o borrar todo desde la pantalla de Historial.",
        toggleName: "Guardar Historial de Partidas",
        toggleDescription: "Apagado significa que las partidas nuevas no se guardarán — esto no borra lo que ya está guardado.",
      },
    },
  },
};
