const {
  formatPlayerList,
  formatLobbyCode,
  canStartGame,
} = require('../public/js/lobby-format');

describe('formatPlayerList', () => {
  it('formats empty player list', () => {
    expect(formatPlayerList([])).toBe('');
  });

  it('formats single player', () => {
    const html = formatPlayerList([{ id: 'p1', name: 'Alice' }]);
    expect(html).toBe('<li>Alice</li>');
  });

  it('formats multiple players', () => {
    const html = formatPlayerList([
      { id: 'p1', name: 'Alice' },
      { id: 'p2', name: 'Bob' },
    ]);
    expect(html).toBe('<li>Alice</li><li>Bob</li>');
  });

  it('adds (you) suffix for current player', () => {
    const html = formatPlayerList(
      [{ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Bob' }],
      'p2'
    );
    expect(html).toBe('<li>Alice</li><li>Bob (you)</li>');
  });

  it('adds (host) suffix for host', () => {
    const html = formatPlayerList(
      [{ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Bob' }],
      null,
      'p1'
    );
    expect(html).toBe('<li>Alice (host)</li><li>Bob</li>');
  });

  it('adds both (you) and (host) when same player', () => {
    const html = formatPlayerList(
      [{ id: 'p1', name: 'Alice' }],
      'p1',
      'p1'
    );
    expect(html).toBe('<li>Alice (you) (host)</li>');
  });

  it('handles undefined players', () => {
    expect(formatPlayerList()).toBe('');
  });
});

describe('formatLobbyCode', () => {
  it('returns code when provided', () => {
    expect(formatLobbyCode('ABC123')).toBe('ABC123');
  });

  it('returns ------ when code is empty', () => {
    expect(formatLobbyCode('')).toBe('------');
  });

  it('returns ------ when code is undefined', () => {
    expect(formatLobbyCode()).toBe('------');
  });
});

describe('canStartGame', () => {
  it('returns false for 0 players', () => {
    expect(canStartGame([])).toBe(false);
  });

  it('returns false for 1 player', () => {
    expect(canStartGame([{ id: 'p1', name: 'Alice' }])).toBe(false);
  });

  it('returns true for 2 players', () => {
    expect(
      canStartGame([
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
      ])
    ).toBe(true);
  });

  it('returns true for more than 2 players', () => {
    expect(
      canStartGame([
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
        { id: 'p3', name: 'Carol' },
      ])
    ).toBe(true);
  });

  it('handles undefined players', () => {
    expect(canStartGame()).toBe(false);
  });
});
