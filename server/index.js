const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const {
  createLobby,
  getLobby,
  joinLobby,
  leaveLobby,
  getLobbyByPlayerId,
  createGame,
  getGame,
  getGameByPlayerId,
  deleteGame,
} = require('./store');
const {
  createDeck,
  getActivePlayers,
  getPlayersInRound,
  processTurn,
  checkGameOver,
  getFinalScores,
  resetForNextRound,
} = require('./game');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, '../public')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

io.on('connection', (socket) => {
  socket.on('createLobby', (data, cb) => {
    const name = (data?.name || '').trim();
    if (!name) return cb?.({ error: 'Name required' });
    const lobby = createLobby(socket.id, name);
    socket.join(lobby.code);
    socket.lobbyCode = lobby.code;
    cb?.({ lobby: { code: lobby.code, players: lobby.players, hostId: lobby.hostId } });
  });

  socket.on('joinLobby', (data, cb) => {
    const code = (data?.code || '').trim().toUpperCase();
    const name = (data?.name || '').trim();
    if (!code || !name) return cb?.({ error: 'Code and name required' });
    const result = joinLobby(code, socket.id, name);
    if (result.error) return cb?.({ error: result.error });
    socket.join(code);
    socket.lobbyCode = code;
    io.to(code).emit('lobbyUpdated', {
      players: result.lobby.players,
      hostId: result.lobby.hostId,
      code: result.lobby.code,
    });
    cb?.({ lobby: result.lobby });
  });

  socket.on('leaveLobby', (cb) => {
    const code = socket.lobbyCode;
    if (!code) return cb?.({ error: 'Not in lobby' });
    const result = leaveLobby(code, socket.id);
    socket.leave(code);
    socket.lobbyCode = null;
    if (result.disbanded) {
      io.to(code).emit('lobbyClosed');
    } else {
      io.to(code).emit('lobbyUpdated', {
        players: result.lobby.players,
        hostId: result.lobby.hostId,
        code: result.lobby.code,
      });
    }
    cb?.({ ok: true });
  });

  socket.on('startGame', (data, cb) => {
    const lobby = getLobbyByPlayerId(socket.id);
    if (!lobby) { if (typeof cb === 'function') cb({ error: 'Not in lobby' }); return; }
    if (lobby.hostId !== socket.id) { if (typeof cb === 'function') cb({ error: 'Only host can start' }); return; }
    if (lobby.players.length < 2) { if (typeof cb === 'function') cb({ error: 'Need at least 2 players' }); return; }

    const artifactEnabled = data?.artifactEnabled ?? false;
    const multiplierEnabled = data?.multiplierEnabled ?? false;
    const game = createGame(lobby, { artifactEnabled, multiplierEnabled });
    game.deck = createDeck(artifactEnabled, multiplierEnabled);
    game.status = 'choosing';
    game.currentTurn = 0;

    for (const p of lobby.players) {
      io.sockets.sockets.get(p.id)?.join(game.id);
    }

    io.to(game.id).emit('gameStarted', {
      gameId: game.id,
      players: game.players,
      sharedPot: game.sharedPot,
      artifactEnabled: game.artifactEnabled,
      multiplierEnabled: game.multiplierEnabled,
      artifactPool: game.artifactPool,
      treasureMultiplier: game.treasureMultiplier ?? 1,
      hazardCounts: game.hazardCounts,
      treasuresRevealed: game.treasuresRevealed || [],
      turnPhase: 'choosing',
    });
    if (typeof cb === 'function') cb({ gameId: game.id });
  });

  socket.on('playerChoice', (data, cb) => {
    const game = getGameByPlayerId(socket.id);
    if (!game) return cb?.({ error: 'Not in game' });
    if (game.status !== 'choosing') return cb?.({ error: 'Not choosing phase' });

    const active = getActivePlayers(game);
    if (!active.some((p) => p.id === socket.id)) return cb?.({ error: 'Not your turn' });

    const choice = data?.choice === 'leave' ? 'leave' : 'stay';
    game.choices[socket.id] = choice;
    cb?.({ ok: true });

    const allChosen = active.every((p) => game.choices[p.id] != null);
    if (allChosen) {
      game.status = 'revealing';
      io.to(game.id).emit('choicesRevealed', {
        choices: { ...game.choices },
      });

      setTimeout(() => {
        const result = processTurn(game);
        game.choices = {};

        const gameOver = checkGameOver(game) || !result.card;
        if (gameOver) {
          game.status = 'finished';
          const finalScores = getFinalScores(game);
          const winner = finalScores[0];
          const endingHazard =
            result.card?.type === 'hazard' &&
            game.hazardCounts[result.card.hazard] === 2
              ? result.card.hazard
              : null;
          const hasMoreRounds = game.roundNumber < game.totalRounds;
          io.to(game.id).emit('gameOver', {
            finalScores,
            winner: winner?.id,
            endingHazard,
            hazardCounts: game.hazardCounts,
            treasuresRevealed: game.treasuresRevealed || [],
            artifactEnabled: game.artifactEnabled,
            multiplierEnabled: game.multiplierEnabled,
            artifactPool: game.artifactPool ?? 0,
            treasureMultiplier: game.treasureMultiplier ?? 1,
            roundNumber: game.roundNumber,
            totalRounds: game.totalRounds,
            hasMoreRounds,
            hostId: game.hostId,
          });
          if (!hasMoreRounds) {
            setTimeout(() => deleteGame(game.id), 60000);
          }
        } else {
          game.status = 'choosing';
          io.to(game.id).emit('cardRevealed', {
            card: result.card,
            players: game.players,
            sharedPot: game.sharedPot,
            artifactPool: game.artifactPool ?? 0,
            treasureMultiplier: game.treasureMultiplier ?? 1,
            hazardCounts: game.hazardCounts,
            treasuresRevealed: game.treasuresRevealed || [],
            turnPhase: 'choosing',
          });
        }
      }, 2000);
    }
  });

  socket.on('nextRound', (data, cb) => {
    const game = getGameByPlayerId(socket.id);
    if (!game) return cb?.({ error: 'Not in game' });
    if (game.status !== 'finished') return cb?.({ error: 'Game not finished' });
    if (game.roundNumber >= game.totalRounds) return cb?.({ error: 'No more rounds' });
    if (game.hostId !== socket.id) return cb?.({ error: 'Only host can start next round' });

    if (data?.artifactEnabled !== undefined) {
      game.artifactEnabled = data.artifactEnabled;
    }
    if (data?.multiplierEnabled !== undefined) {
      game.multiplierEnabled = data.multiplierEnabled;
    }
    resetForNextRound(game);
    game.status = 'choosing';

    io.to(game.id).emit('gameStarted', {
      gameId: game.id,
      players: game.players,
      sharedPot: game.sharedPot,
      artifactEnabled: game.artifactEnabled,
      multiplierEnabled: game.multiplierEnabled,
      artifactPool: game.artifactPool,
      treasureMultiplier: game.treasureMultiplier ?? 1,
      hazardCounts: game.hazardCounts,
      treasuresRevealed: game.treasuresRevealed || [],
      turnPhase: 'choosing',
    });
    if (typeof cb === 'function') cb({ ok: true });
  });

  socket.on('disconnect', () => {
    const lobby = getLobbyByPlayerId(socket.id);
    if (lobby) {
      const result = leaveLobby(lobby.code, socket.id);
      if (result.disbanded) {
        io.to(lobby.code).emit('lobbyClosed');
      } else {
        io.to(lobby.code).emit('lobbyUpdated', {
          players: result.lobby.players,
          hostId: result.lobby.hostId,
          code: result.lobby.code,
        });
      }
    }

    const game = getGameByPlayerId(socket.id);
    if (game && game.status !== 'finished') {
      const player = game.players.find((p) => p.id === socket.id);
      if (player) {
        player.status = 'disconnected';
        game.choices[socket.id] = 'leave';
        if (game.status === 'choosing') {
            const inRound = getPlayersInRound(game);
            const allChosen = inRound.every((p) => game.choices[p.id] != null);
          if (allChosen) {
            game.status = 'revealing';
            io.to(game.id).emit('choicesRevealed', { choices: { ...game.choices } });
            setTimeout(() => {
              const result = processTurn(game);
              game.choices = {};
              const gameOver = checkGameOver(game) || !result.card;
              if (gameOver) {
                game.status = 'finished';
                const finalScores = getFinalScores(game);
                const endingHazard =
                  result.card?.type === 'hazard' &&
                  game.hazardCounts[result.card.hazard] === 2
                    ? result.card.hazard
                    : null;
                const hasMoreRounds = game.roundNumber < game.totalRounds;
                io.to(game.id).emit('gameOver', {
                  finalScores,
                  winner: finalScores[0]?.id,
                  endingHazard,
                  hazardCounts: game.hazardCounts,
                  treasuresRevealed: game.treasuresRevealed || [],
                  artifactEnabled: game.artifactEnabled,
                  multiplierEnabled: game.multiplierEnabled,
                  artifactPool: game.artifactPool ?? 0,
                  treasureMultiplier: game.treasureMultiplier ?? 1,
                  roundNumber: game.roundNumber,
                  totalRounds: game.totalRounds,
                  hasMoreRounds,
                  hostId: game.hostId,
                });
                if (!hasMoreRounds) {
                  setTimeout(() => deleteGame(game.id), 60000);
                }
              } else {
                game.status = 'choosing';
                io.to(game.id).emit('cardRevealed', {
                  card: result.card,
                  players: game.players,
                  sharedPot: game.sharedPot,
                  artifactPool: game.artifactPool ?? 0,
                  treasureMultiplier: game.treasureMultiplier ?? 1,
                  hazardCounts: game.hazardCounts,
                  treasuresRevealed: game.treasuresRevealed || [],
                  turnPhase: 'choosing',
                });
              }
            }, 2000);
          }
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
