const lobbies = new Map();
const games = new Map();

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCode() {
  let code;
  do {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += CHARS[Math.floor(Math.random() * CHARS.length)];
    }
  } while (lobbies.has(code));
  return code;
}

function createLobby(hostId, hostName) {
  const code = generateCode();
  const lobby = {
    code,
    hostId,
    players: [{ id: hostId, name: hostName }],
    status: 'waiting',
  };
  lobbies.set(code, lobby);
  return lobby;
}

function getLobby(code) {
  return lobbies.get(code?.toUpperCase());
}

function joinLobby(code, playerId, playerName) {
  const lobby = getLobby(code);
  if (!lobby) return { error: 'Lobby not found' };
  if (lobby.status !== 'waiting') return { error: 'Game already started' };
  const nameExists = lobby.players.some((p) => p.name.toLowerCase() === playerName.toLowerCase());
  if (nameExists) return { error: 'Name already taken' };
  lobby.players.push({ id: playerId, name: playerName });
  return { lobby };
}

function leaveLobby(code, playerId) {
  const lobby = getLobby(code);
  if (!lobby) return { error: 'Lobby not found' };
  lobby.players = lobby.players.filter((p) => p.id !== playerId);
  if (lobby.players.length === 0) {
    lobbies.delete(code);
    return { disbanded: true };
  }
  if (lobby.hostId === playerId) {
    lobby.hostId = lobby.players[0].id;
  }
  return { lobby };
}

function getLobbyByPlayerId(playerId) {
  for (const lobby of lobbies.values()) {
    if (lobby.players.some((p) => p.id === playerId)) return lobby;
  }
  return null;
}

function createGame(lobby, options = {}) {
  const artifactEnabled = options?.artifactEnabled ?? false;
  const multiplierEnabled = options?.multiplierEnabled ?? false;
  const gameId = lobby.code + '-' + Date.now();
  const game = {
    id: gameId,
    lobbyCode: lobby.code,
    players: lobby.players.map((p) => ({
      id: p.id,
      name: p.name,
      score: 0,
      treasuresInFront: 0,
      status: 'active',
      leftThisTurn: false,
    })),
    hostId: lobby.hostId,
    roundNumber: 1,
    totalRounds: 5,
    sharedPot: 0,
    artifactEnabled,
    multiplierEnabled,
    artifactPool: 0,
    treasureMultiplier: 1,
    hazardCounts: {},
    treasuresRevealed: [],
    deck: null,
    currentTurn: null,
    choices: {},
    status: 'starting',
  };
  games.set(gameId, game);
  lobbies.delete(lobby.code);
  return game;
}

function getGame(gameId) {
  return games.get(gameId);
}

function getGameByPlayerId(playerId) {
  for (const game of games.values()) {
    if (game.players.some((p) => p.id === playerId)) return game;
  }
  return null;
}

function deleteGame(gameId) {
  games.delete(gameId);
}

module.exports = {
  lobbies,
  games,
  createLobby,
  getLobby,
  joinLobby,
  leaveLobby,
  getLobbyByPlayerId,
  createGame,
  getGame,
  getGameByPlayerId,
  deleteGame,
};
