/**
 * Pure formatting logic for the lobby UI.
 * Used by Lobby in lobby.js; testable without DOM.
 */
function formatPlayerList(players = [], playerId = null, hostId = null) {
  return players
    .map(
      (p) =>
        `<li>${p.name}${p.id === playerId ? ' (you)' : ''}${p.id === hostId ? ' (host)' : ''}</li>`
    )
    .join('');
}

function formatLobbyCode(code) {
  return code || '------';
}

function canStartGame(players = []) {
  return (players?.length || 0) >= 2;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { formatPlayerList, formatLobbyCode, canStartGame };
} else {
  window.formatPlayerList = formatPlayerList;
  window.formatLobbyCode = formatLobbyCode;
  window.canStartGame = canStartGame;
}
