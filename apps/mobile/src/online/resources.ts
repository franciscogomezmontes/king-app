/**
 * Online mode's own "online" i18n namespace — lobby/room-code/connection copy only. The in-game
 * screen reuses the existing "game" namespace's trump/auction/redeal/turn-message keys as-is
 * (identical meaning to Solo mode), and the room-rules picker reuses "rules"/"settings" — no new
 * keys needed for either. Add new UI strings in English and Spanish together.
 */
export const ONLINE_RESOURCES = {
  en: {
    online: {
      title: "Online",
      connecting: "Connecting…",
      modeChoice: {
        host: "Host a Game",
        join: "Join a Game",
      },
      displayName: {
        label: "Your Name",
        placeholder: "Your Name",
      },
      serverAddress: {
        label: "Server Address",
        placeholder: "192.168.1.42:2567",
        hint: "Ask your host for their address — everyone needs to be on the same WiFi network.",
      },
      roomCode: {
        label: "Room Code",
        placeholder: "ABCDE",
      },
      create: {
        button: "Create Room",
      },
      join: {
        button: "Join Room",
      },
      waiting: {
        title: "Waiting for players",
        shareHint: "Share this code with the other players.",
        you: "You",
        seat: "Seat {{number}}",
        empty: "Waiting…",
      },
      disconnected: "Disconnected: {{names}}",
      leaveRoom: "Leave Room",
    },
  },
  es: {
    online: {
      title: "En Línea",
      connecting: "Conectando…",
      modeChoice: {
        host: "Crear Partida",
        join: "Unirse a una Partida",
      },
      displayName: {
        label: "Tu Nombre",
        placeholder: "Tu Nombre",
      },
      serverAddress: {
        label: "Dirección del Servidor",
        placeholder: "192.168.1.42:2567",
        hint: "Pídele la dirección a quien creó la partida — todos deben estar en la misma red WiFi.",
      },
      roomCode: {
        label: "Código de Sala",
        placeholder: "ABCDE",
      },
      create: {
        button: "Crear Sala",
      },
      join: {
        button: "Unirse a la Sala",
      },
      waiting: {
        title: "Esperando jugadores",
        shareHint: "Comparte este código con los demás jugadores.",
        you: "Tú",
        seat: "Asiento {{number}}",
        empty: "Esperando…",
      },
      disconnected: "Desconectado: {{names}}",
      leaveRoom: "Salir de la Sala",
    },
  },
};
