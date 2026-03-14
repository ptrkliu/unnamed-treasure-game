const HAZARDS = ['fire', 'rocks', 'snakes', 'spiders', 'mummies'];

const ARTIFACT_VALUES = [10, 12, 14];

function createDeck(artifactEnabled = false, multiplierEnabled = false) {
  const cards = [];
  for (let v = 5; v <= 19; v++) {
    cards.push({ type: 'treasure', value: v });
  }
  for (const hazard of HAZARDS) {
    for (let i = 0; i < 3; i++) {
      cards.push({ type: 'hazard', hazard });
    }
  }
  if (artifactEnabled) {
    for (const value of ARTIFACT_VALUES) {
      cards.push({ type: 'artifact', value });
    }
  }
  if (multiplierEnabled) {
    cards.push({ type: 'multiplier' });
  }
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

function getActivePlayers(game) {
  return game.players.filter(
    (p) => p.status === 'active' && !p.leftThisTurn
  );
}

function getPlayersInRound(game) {
  return game.players.filter(
    (p) => p.status === 'active' || p.status === 'disconnected'
  );
}

function processTurn(game) {
  const inRound = getPlayersInRound(game);
  const stayed = inRound.filter((p) => game.choices[p.id] === 'stay');
  const left = inRound.filter((p) => game.choices[p.id] === 'leave');

  const card = game.deck?.shift?.();
  if (!card) {
    return { card: null, stayed: [], left: [] };
  }

  game.artifactPool = game.artifactPool ?? 0;

  if (card.type === 'multiplier') {
    game.treasureMultiplier = (game.treasureMultiplier || 1) * 2;
  } else if (card.type === 'treasure') {
    game.treasuresRevealed = game.treasuresRevealed || [];
    game.treasuresRevealed.push(card.value);
    const scale = game.playerScaleMultiplier ?? 1;
    const effectiveValue = card.value * (game.treasureMultiplier || 1) * scale;
    if (stayed.length > 0) {
      const share = Math.floor(effectiveValue / stayed.length);
      const remainder = effectiveValue % stayed.length;
      for (const p of stayed) {
        const player = game.players.find((x) => x.id === p.id);
        player.treasuresInFront += share;
      }
      game.sharedPot += remainder;
    }
  } else if (card.type === 'artifact') {
    const scale = game.playerScaleMultiplier ?? 1;
    game.artifactPool += card.value * scale;
  } else {
    game.hazardCounts[card.hazard] = (game.hazardCounts[card.hazard] || 0) + 1;
    if (game.hazardCounts[card.hazard] === 2) {
      for (const p of stayed) {
        const player = game.players.find((x) => x.id === p.id);
        player.treasuresInFront = 0;
        player.status = 'dead';
      }
    }
  }

  for (const p of left) {
    const player = game.players.find((x) => x.id === p.id);
    player.score += player.treasuresInFront;
    player.treasuresInFront = 0;
    player.status = 'left';
    player.leftThisTurn = true;
  }

  if (left.length > 0 && game.sharedPot > 0) {
    const potShare = Math.floor(game.sharedPot / left.length);
    const potRemainder = game.sharedPot % left.length;
    for (let i = 0; i < left.length; i++) {
      const player = game.players.find((x) => x.id === left[i].id);
      player.score += potShare + (i < potRemainder ? 1 : 0);
    }
    game.sharedPot = 0;
  }

  if (left.length === 1 && game.artifactPool > 0) {
    const player = game.players.find((x) => x.id === left[0].id);
    player.score += game.artifactPool;
    game.artifactPool = 0;
  }

  return { card, stayed, left };
}

function checkGameOver(game) {
  const active = game.players.filter(
    (p) => p.status === 'active' && !p.leftThisTurn
  );
  if (active.length === 0 || game.deck.length === 0) {
    return true;
  }
  return false;
}

function getFinalScores(game) {
  return game.players
    .map((p) => ({ id: p.id, name: p.name, score: p.score }))
    .sort((a, b) => b.score - a.score);
}

function resetForNextRound(game) {
  game.roundNumber += 1;
  game.deck = createDeck(game.artifactEnabled, game.multiplierEnabled);
  game.sharedPot = 0;
  game.artifactPool = 0;
  game.treasureMultiplier = 1;
  game.hazardCounts = {};
  game.treasuresRevealed = [];
  game.choices = {};
  for (const p of game.players) {
    p.treasuresInFront = 0;
    p.status = 'active';
    p.leftThisTurn = false;
  }
  return game;
}

module.exports = {
  createDeck,
  getActivePlayers,
  getPlayersInRound,
  processTurn,
  checkGameOver,
  getFinalScores,
  resetForNextRound,
  HAZARDS,
  ARTIFACT_VALUES,
};
