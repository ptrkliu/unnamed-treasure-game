const {
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
} = require('../server/store');

beforeEach(() => {
  lobbies.clear();
  games.clear();
});

describe('createLobby', () => {
  it('creates lobby with host as first player', () => {
    const lobby = createLobby('host1', 'Alice');
    expect(lobby.code).toMatch(/^[A-Z0-9]{6}$/);
    expect(lobby.hostId).toBe('host1');
    expect(lobby.players).toEqual([{ id: 'host1', name: 'Alice' }]);
    expect(lobby.status).toBe('waiting');
    expect(getLobby(lobby.code)).toEqual(lobby);
  });
});

describe('getLobby', () => {
  it('returns lobby for valid code (case-insensitive)', () => {
    const lobby = createLobby('h1', 'Host');
    expect(getLobby(lobby.code)).toEqual(lobby);
    expect(getLobby(lobby.code.toLowerCase())).toEqual(lobby);
  });

  it('returns undefined for unknown code', () => {
    expect(getLobby('XXXXXX')).toBeUndefined();
  });

  it('returns undefined for null/undefined code', () => {
    expect(getLobby(null)).toBeUndefined();
  });
});

describe('joinLobby', () => {
  it('adds player to lobby', () => {
    const lobby = createLobby('h1', 'Host');
    const result = joinLobby(lobby.code, 'p2', 'Bob');
    expect(result.error).toBeUndefined();
    expect(result.lobby.players).toHaveLength(2);
    expect(result.lobby.players[1]).toEqual({ id: 'p2', name: 'Bob' });
  });

  it('returns error for unknown code', () => {
    const result = joinLobby('XXXXXX', 'p1', 'Alice');
    expect(result.error).toBe('Lobby not found');
  });

  it('returns error when name already taken (case-insensitive)', () => {
    const lobby = createLobby('h1', 'Alice');
    const result = joinLobby(lobby.code, 'p2', 'alice');
    expect(result.error).toBe('Name already taken');
    expect(lobby.players).toHaveLength(1);
  });

  it('returns error when game already started', () => {
    const lobby = createLobby('h1', 'Host');
    lobby.status = 'started';
    const result = joinLobby(lobby.code, 'p2', 'Bob');
    expect(result.error).toBe('Game already started');
  });
});

describe('leaveLobby', () => {
  it('removes player from lobby', () => {
    const lobby = createLobby('h1', 'Host');
    joinLobby(lobby.code, 'p2', 'Bob');
    const result = leaveLobby(lobby.code, 'p2');
    expect(result.error).toBeUndefined();
    expect(result.lobby.players).toHaveLength(1);
    expect(result.lobby.players[0].id).toBe('h1');
  });

  it('disbands lobby when last player leaves', () => {
    const lobby = createLobby('h1', 'Host');
    const result = leaveLobby(lobby.code, 'h1');
    expect(result.disbanded).toBe(true);
    expect(getLobby(lobby.code)).toBeUndefined();
  });

  it('reassigns host when host leaves', () => {
    const lobby = createLobby('h1', 'Host');
    joinLobby(lobby.code, 'p2', 'Bob');
    joinLobby(lobby.code, 'p3', 'Carol');
    const result = leaveLobby(lobby.code, 'h1');
    expect(result.lobby.hostId).toBe('p2');
    expect(result.lobby.players).toHaveLength(2);
  });

  it('returns error for unknown code', () => {
    const result = leaveLobby('XXXXXX', 'p1');
    expect(result.error).toBe('Lobby not found');
  });
});

describe('getLobbyByPlayerId', () => {
  it('returns lobby when player is in it', () => {
    const lobby = createLobby('h1', 'Host');
    joinLobby(lobby.code, 'p2', 'Bob');
    expect(getLobbyByPlayerId('p2')).toEqual(lobby);
  });

  it('returns null when player not in any lobby', () => {
    expect(getLobbyByPlayerId('unknown')).toBeNull();
  });
});

describe('createGame', () => {
  it('creates game from lobby and removes lobby', () => {
    const lobby = createLobby('h1', 'Host');
    joinLobby(lobby.code, 'p2', 'Bob');
    const game = createGame(lobby);
    expect(game.id).toMatch(new RegExp(`^${lobby.code}-\\d+$`));
    expect(game.players).toHaveLength(2);
    expect(game.players[0]).toEqual({
      id: 'h1',
      name: 'Host',
      score: 0,
      treasuresInFront: 0,
      status: 'active',
      leftThisTurn: false,
    });
    expect(game.hostId).toBe('h1');
    expect(game.status).toBe('starting');
    expect(getLobby(lobby.code)).toBeUndefined();
    expect(getGame(game.id)).toEqual(game);
  });

  it('creates game with artifactEnabled when passed in options', () => {
    const lobby = createLobby('h1', 'Host');
    joinLobby(lobby.code, 'p2', 'Bob');
    const game = createGame(lobby, { artifactEnabled: true });
    expect(game.artifactEnabled).toBe(true);
    expect(game.artifactPool).toBe(0);
  });

  it('creates game with multiplierEnabled when passed in options', () => {
    const lobby = createLobby('h1', 'Host');
    joinLobby(lobby.code, 'p2', 'Bob');
    const game = createGame(lobby, { multiplierEnabled: true });
    expect(game.multiplierEnabled).toBe(true);
    expect(game.treasureMultiplier).toBe(1);
  });
});

describe('getGame', () => {
  it('returns game for valid id', () => {
    const lobby = createLobby('h1', 'Host');
    const game = createGame(lobby);
    expect(getGame(game.id)).toEqual(game);
  });

  it('returns undefined for unknown id', () => {
    expect(getGame('unknown')).toBeUndefined();
  });
});

describe('getGameByPlayerId', () => {
  it('returns game when player is in it', () => {
    const lobby = createLobby('h1', 'Host');
    joinLobby(lobby.code, 'p2', 'Bob');
    const game = createGame(lobby);
    expect(getGameByPlayerId('p2')).toEqual(game);
  });

  it('returns null when player not in any game', () => {
    expect(getGameByPlayerId('unknown')).toBeNull();
  });
});

describe('deleteGame', () => {
  it('removes game from store', () => {
    const lobby = createLobby('h1', 'Host');
    const game = createGame(lobby);
    deleteGame(game.id);
    expect(getGame(game.id)).toBeUndefined();
  });
});
