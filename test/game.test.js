const {
  createDeck,
  getActivePlayers,
  getPlayersInRound,
  processTurn,
  checkGameOver,
  getFinalScores,
  resetForNextRound,
  HAZARDS,
  ARTIFACT_VALUES,
} = require('../server/game');

describe('createDeck', () => {
  it('returns 30 cards (15 treasure + 15 hazard)', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(30);
  });

  it('contains 15 treasure cards with values 5-19', () => {
    const deck = createDeck();
    const treasures = deck.filter((c) => c.type === 'treasure');
    expect(treasures).toHaveLength(15);
    const values = treasures.map((c) => c.value).sort((a, b) => a - b);
    expect(values).toEqual([5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
  });

  it('contains 3 hazard cards per hazard type', () => {
    const deck = createDeck();
    for (const hazard of HAZARDS) {
      const count = deck.filter((c) => c.type === 'hazard' && c.hazard === hazard).length;
      expect(count).toBe(3);
    }
  });

  it('shuffles the deck (order varies between calls)', () => {
    const deck1 = createDeck();
    const deck2 = createDeck();
    const order1 = deck1.map((c) => (c.type === 'treasure' ? `t${c.value}` : c.type === 'artifact' ? `a${c.value}` : `h-${c.hazard}`)).join(',');
    const order2 = deck2.map((c) => (c.type === 'treasure' ? `t${c.value}` : c.type === 'artifact' ? `a${c.value}` : `h-${c.hazard}`)).join(',');
    expect(order1).not.toEqual(order2);
  });

  it('with artifactEnabled true returns 33 cards including 3 artifacts', () => {
    const deck = createDeck(true);
    expect(deck).toHaveLength(33);
    const artifacts = deck.filter((c) => c.type === 'artifact');
    expect(artifacts).toHaveLength(3);
    const values = artifacts.map((c) => c.value).sort((a, b) => a - b);
    expect(values).toEqual(ARTIFACT_VALUES);
  });

  it('with multiplierEnabled true returns 31 cards including 1 multiplier', () => {
    const deck = createDeck(false, true);
    expect(deck).toHaveLength(31);
    const multipliers = deck.filter((c) => c.type === 'multiplier');
    expect(multipliers).toHaveLength(1);
    expect(multipliers[0]).toEqual({ type: 'multiplier' });
  });

  it('with both artifactEnabled and multiplierEnabled returns 34 cards', () => {
    const deck = createDeck(true, true);
    expect(deck).toHaveLength(34);
    expect(deck.filter((c) => c.type === 'artifact')).toHaveLength(3);
    expect(deck.filter((c) => c.type === 'multiplier')).toHaveLength(1);
  });
});

describe('getActivePlayers', () => {
  it('returns only active players who have not left this turn', () => {
    const game = {
      players: [
        { id: 'a', status: 'active', leftThisTurn: false },
        { id: 'b', status: 'active', leftThisTurn: true },
        { id: 'c', status: 'left', leftThisTurn: true },
        { id: 'd', status: 'dead', leftThisTurn: false },
        { id: 'e', status: 'active', leftThisTurn: false },
      ],
    };
    const active = getActivePlayers(game);
    expect(active).toHaveLength(2);
    expect(active.map((p) => p.id)).toEqual(['a', 'e']);
  });
});

describe('getPlayersInRound', () => {
  it('returns active and disconnected players', () => {
    const game = {
      players: [
        { id: 'a', status: 'active' },
        { id: 'b', status: 'disconnected' },
        { id: 'c', status: 'left' },
        { id: 'd', status: 'dead' },
      ],
    };
    const inRound = getPlayersInRound(game);
    expect(inRound).toHaveLength(2);
    expect(inRound.map((p) => p.id)).toEqual(['a', 'b']);
  });
});

describe('processTurn', () => {
  function makeGame(deck, players = ['p1', 'p2']) {
    return {
      players: players.map((id) => ({
        id,
        name: id,
        score: 0,
        treasuresInFront: 0,
        status: 'active',
        leftThisTurn: false,
      })),
      sharedPot: 0,
      artifactPool: 0,
      hazardCounts: {},
      treasuresRevealed: [],
      deck: [...deck],
      choices: {},
    };
  }

  it('returns null card when deck is empty', () => {
    const game = makeGame([]);
    const result = processTurn(game);
    expect(result.card).toBeNull();
    expect(result.stayed).toEqual([]);
    expect(result.left).toEqual([]);
  });

  it('distributes treasure evenly to stayed players', () => {
    const game = makeGame([{ type: 'treasure', value: 10 }]);
    game.choices = { p1: 'stay', p2: 'stay' };
    const result = processTurn(game);
    expect(result.card).toEqual({ type: 'treasure', value: 10 });
    expect(game.players[0].treasuresInFront).toBe(5);
    expect(game.players[1].treasuresInFront).toBe(5);
    expect(game.sharedPot).toBe(0);
  });

  it('puts remainder in sharedPot when treasure does not divide evenly', () => {
    const game = makeGame([{ type: 'treasure', value: 10 }]);
    game.choices = { p1: 'stay', p2: 'stay', p3: 'stay' };
    game.players.push({
      id: 'p3',
      name: 'p3',
      score: 0,
      treasuresInFront: 0,
      status: 'active',
      leftThisTurn: false,
    });
    const result = processTurn(game);
    expect(result.card).toEqual({ type: 'treasure', value: 10 });
    expect(game.players[0].treasuresInFront).toBe(3);
    expect(game.players[1].treasuresInFront).toBe(3);
    expect(game.players[2].treasuresInFront).toBe(3);
    expect(game.sharedPot).toBe(1);
  });

  it('gives leaving players their treasuresInFront and shared pot share', () => {
    const game = makeGame([{ type: 'treasure', value: 10 }]);
    game.players[0].treasuresInFront = 7;
    game.players[1].treasuresInFront = 5;
    game.sharedPot = 4;
    game.choices = { p1: 'leave', p2: 'leave' };
    const result = processTurn(game);
    expect(game.players[0].score).toBe(9); // 7 + 2 (half of 4)
    expect(game.players[1].score).toBe(7); // 5 + 2
    expect(game.players[0].treasuresInFront).toBe(0);
    expect(game.players[1].treasuresInFront).toBe(0);
    expect(game.sharedPot).toBe(0);
    expect(game.players[0].status).toBe('left');
    expect(game.players[1].status).toBe('left');
  });

  it('increments hazard count on first hazard', () => {
    const game = makeGame([{ type: 'hazard', hazard: 'snakes' }]);
    game.choices = { p1: 'stay', p2: 'stay' };
    const result = processTurn(game);
    expect(result.card).toEqual({ type: 'hazard', hazard: 'snakes' });
    expect(game.hazardCounts.snakes).toBe(1);
    expect(game.players[0].status).toBe('active');
    expect(game.players[1].status).toBe('active');
  });

  it('kills stayed players when second hazard of same type is revealed', () => {
    const game = makeGame([
      { type: 'hazard', hazard: 'snakes' },
      { type: 'hazard', hazard: 'snakes' },
    ]);
    game.choices = { p1: 'stay', p2: 'leave' };
    game.players[0].treasuresInFront = 10;
    processTurn(game);
    expect(game.hazardCounts.snakes).toBe(1);
    processTurn(game);
    expect(game.hazardCounts.snakes).toBe(2);
    expect(game.players[0].status).toBe('dead');
    expect(game.players[0].treasuresInFront).toBe(0);
    expect(game.players[1].status).toBe('left');
    expect(game.players[1].score).toBe(0); // left before treasure
  });

  it('distributes shared pot remainder to first N leavers', () => {
    const game = makeGame([{ type: 'treasure', value: 1 }]);
    game.players[0].treasuresInFront = 0;
    game.players[1].treasuresInFront = 0;
    game.sharedPot = 5;
    game.choices = { p1: 'leave', p2: 'leave', p3: 'leave' };
    game.players.push({
      id: 'p3',
      name: 'p3',
      score: 0,
      treasuresInFront: 0,
      status: 'active',
      leftThisTurn: false,
    });
    processTurn(game);
    // 5/3 = 1 each, remainder 2 goes to first 2
    expect(game.players[0].score).toBe(2); // 0 + 1 + 1
    expect(game.players[1].score).toBe(2); // 0 + 1 + 1
    expect(game.players[2].score).toBe(1); // 0 + 1
  });

  it('adds artifact to pool when revealed, no distribution to players', () => {
    const game = makeGame([{ type: 'artifact', value: 12 }]);
    game.choices = { p1: 'stay', p2: 'stay' };
    const result = processTurn(game);
    expect(result.card).toEqual({ type: 'artifact', value: 12 });
    expect(game.artifactPool).toBe(12);
    expect(game.players[0].treasuresInFront).toBe(0);
    expect(game.players[1].treasuresInFront).toBe(0);
    expect(game.sharedPot).toBe(0);
  });

  it('awards artifact pool to single leaver', () => {
    const game = makeGame([{ type: 'treasure', value: 5 }]);
    game.artifactPool = 24;
    game.players[0].treasuresInFront = 3;
    game.choices = { p1: 'leave', p2: 'stay' };
    processTurn(game);
    expect(game.players[0].score).toBe(3 + 24); // treasuresInFront + artifactPool
    expect(game.artifactPool).toBe(0);
  });

  it('keeps artifact pool when multiple players leave', () => {
    const game = makeGame([{ type: 'treasure', value: 5 }]);
    game.artifactPool = 36;
    game.players[0].treasuresInFront = 2;
    game.players[1].treasuresInFront = 3;
    game.choices = { p1: 'leave', p2: 'leave' };
    processTurn(game);
    expect(game.players[0].score).toBe(2);
    expect(game.players[1].score).toBe(3);
    expect(game.artifactPool).toBe(36);
  });

  it('keeps artifact pool when no one leaves', () => {
    const game = makeGame([{ type: 'artifact', value: 10 }]);
    game.artifactPool = 12;
    game.choices = { p1: 'stay', p2: 'stay' };
    processTurn(game);
    expect(game.artifactPool).toBe(22); // 12 + 10
    expect(game.players[0].score).toBe(0);
    expect(game.players[1].score).toBe(0);
  });

  it('artifact then treasure: artifact to pool, treasure distributed', () => {
    const game = makeGame([
      { type: 'artifact', value: 14 },
      { type: 'treasure', value: 8 },
    ]);
    game.choices = { p1: 'stay', p2: 'stay' };
    processTurn(game);
    expect(game.artifactPool).toBe(14);
    processTurn(game);
    expect(game.players[0].treasuresInFront).toBe(4);
    expect(game.players[1].treasuresInFront).toBe(4);
    expect(game.artifactPool).toBe(14);
  });

  it('multiplier doubles treasure value for subsequent treasures', () => {
    const game = makeGame([
      { type: 'multiplier' },
      { type: 'treasure', value: 10 },
    ]);
    game.choices = { p1: 'stay', p2: 'stay' };
    processTurn(game);
    expect(game.treasureMultiplier).toBe(2);
    processTurn(game);
    expect(game.players[0].treasuresInFront).toBe(10); // 20/2
    expect(game.players[1].treasuresInFront).toBe(10);
    expect(game.sharedPot).toBe(0);
  });

  it('multiplier does not affect artifact pool', () => {
    const game = makeGame([
      { type: 'multiplier' },
      { type: 'artifact', value: 12 },
    ]);
    game.choices = { p1: 'stay', p2: 'stay' };
    processTurn(game);
    processTurn(game);
    expect(game.artifactPool).toBe(12);
    expect(game.treasureMultiplier).toBe(2);
  });

  it('treasures before multiplier are not doubled', () => {
    const game = makeGame([
      { type: 'treasure', value: 10 },
      { type: 'multiplier' },
      { type: 'treasure', value: 10 },
    ]);
    game.choices = { p1: 'stay', p2: 'stay' };
    processTurn(game);
    expect(game.players[0].treasuresInFront).toBe(5);
    processTurn(game);
    expect(game.treasureMultiplier).toBe(2);
    processTurn(game);
    expect(game.players[0].treasuresInFront).toBe(15); // 5 + 10
    expect(game.players[1].treasuresInFront).toBe(15);
  });
});

describe('checkGameOver', () => {
  it('returns true when no active players', () => {
    const game = {
      players: [
        { id: 'a', status: 'left', leftThisTurn: true },
        { id: 'b', status: 'dead', leftThisTurn: false },
      ],
      deck: [1, 2, 3],
    };
    expect(checkGameOver(game)).toBe(true);
  });

  it('returns true when deck is empty', () => {
    const game = {
      players: [{ id: 'a', status: 'active', leftThisTurn: false }],
      deck: [],
    };
    expect(checkGameOver(game)).toBe(true);
  });

  it('returns false when active players and deck has cards', () => {
    const game = {
      players: [{ id: 'a', status: 'active', leftThisTurn: false }],
      deck: [{ type: 'treasure', value: 10 }],
    };
    expect(checkGameOver(game)).toBe(false);
  });

  it('excludes leftThisTurn players from active count', () => {
    const game = {
      players: [
        { id: 'a', status: 'active', leftThisTurn: true },
      ],
      deck: [1],
    };
    expect(checkGameOver(game)).toBe(true);
  });
});

describe('getFinalScores', () => {
  it('returns players sorted by score descending', () => {
    const game = {
      players: [
        { id: 'a', name: 'Alice', score: 10 },
        { id: 'b', name: 'Bob', score: 25 },
        { id: 'c', name: 'Carol', score: 15 },
      ],
    };
    const scores = getFinalScores(game);
    expect(scores).toEqual([
      { id: 'b', name: 'Bob', score: 25 },
      { id: 'c', name: 'Carol', score: 15 },
      { id: 'a', name: 'Alice', score: 10 },
    ]);
  });
});

describe('resetForNextRound', () => {
  it('resets per-round state and preserves player scores', () => {
    const game = {
      players: [
        { id: 'a', name: 'Alice', score: 15, treasuresInFront: 0, status: 'left', leftThisTurn: true },
        { id: 'b', name: 'Bob', score: 8, treasuresInFront: 0, status: 'dead', leftThisTurn: false },
      ],
      sharedPot: 3,
      artifactPool: 10,
      hazardCounts: { snakes: 2 },
      treasuresRevealed: [5, 10],
      choices: { a: 'leave', b: 'stay' },
      roundNumber: 1,
      totalRounds: 5,
      artifactEnabled: false,
      multiplierEnabled: false,
    };
    resetForNextRound(game);
    expect(game.players[0].score).toBe(15);
    expect(game.players[1].score).toBe(8);
    expect(game.players[0].treasuresInFront).toBe(0);
    expect(game.players[1].treasuresInFront).toBe(0);
    expect(game.players[0].status).toBe('active');
    expect(game.players[1].status).toBe('active');
    expect(game.players[0].leftThisTurn).toBe(false);
    expect(game.players[1].leftThisTurn).toBe(false);
    expect(game.sharedPot).toBe(0);
    expect(game.artifactPool).toBe(0);
    expect(game.hazardCounts).toEqual({});
    expect(game.treasuresRevealed).toEqual([]);
    expect(game.choices).toEqual({});
    expect(game.deck).toHaveLength(30);
  });

  it('with artifactEnabled true creates 33-card deck', () => {
    const game = {
      players: [{ id: 'a', score: 0, treasuresInFront: 0, status: 'active', leftThisTurn: false }],
      sharedPot: 0,
      artifactEnabled: true,
      multiplierEnabled: false,
      hazardCounts: {},
      treasuresRevealed: [],
      choices: {},
      roundNumber: 1,
      totalRounds: 5,
    };
    resetForNextRound(game);
    expect(game.deck).toHaveLength(33);
    expect(game.artifactPool).toBe(0);
  });

  it('with multiplierEnabled true creates 31-card deck', () => {
    const game = {
      players: [{ id: 'a', score: 0, treasuresInFront: 0, status: 'active', leftThisTurn: false }],
      sharedPot: 0,
      artifactEnabled: false,
      multiplierEnabled: true,
      hazardCounts: {},
      treasuresRevealed: [],
      choices: {},
      roundNumber: 1,
      totalRounds: 5,
    };
    resetForNextRound(game);
    expect(game.deck).toHaveLength(31);
    expect(game.deck.filter((c) => c.type === 'multiplier')).toHaveLength(1);
  });

  it('increments roundNumber', () => {
    const game = {
      players: [
        { id: 'a', score: 10, treasuresInFront: 0, status: 'active', leftThisTurn: false },
      ],
      sharedPot: 0,
      hazardCounts: {},
      treasuresRevealed: [],
      choices: {},
      roundNumber: 2,
      totalRounds: 5,
      artifactEnabled: false,
      multiplierEnabled: false,
    };
    resetForNextRound(game);
    expect(game.roundNumber).toBe(3);
  });
});
