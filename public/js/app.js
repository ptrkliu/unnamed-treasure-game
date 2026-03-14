const rawSocket = io();

// Wrap socket to log all emitted and received events
const originalEmit = rawSocket.emit.bind(rawSocket);
rawSocket.emit = function (event, ...args) {
  incanLog.debug('emit', event, args.length > 0 ? args : '');
  return originalEmit(event, ...args);
};
const originalOn = rawSocket.on.bind(rawSocket);
rawSocket.on = function (event, fn) {
  return originalOn(event, function (...args) {
    incanLog.debug('received', event, args.length > 0 ? args : '');
    return fn.apply(this, args);
  });
};

const socket = rawSocket;

let state = {
  lobby: null,
  gameId: null,
  playerId: null,
  isHost: false,
};

function showScreen(id) {
  document.querySelectorAll('.screen').forEach((el) => el.classList.add('hidden'));
  const screen = document.getElementById(id);
  if (screen) screen.classList.remove('hidden');
}

function showError(elId, msg) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = msg || '';
  el.classList.toggle('hidden', !msg);
}

incanLog.info('App initialized');

document.getElementById('create-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('create-name').value.trim();
  showError('error');
  socket.emit('createLobby', { name }, (res) => {
    if (res?.error) {
      showError('error', res.error);
      return;
    }
    state.lobby = res.lobby;
    state.playerId = socket.id;
    state.isHost = true;
    Lobby.init(res.lobby);
    showScreen('lobby');
  });
});

document.getElementById('join-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const code = document.getElementById('join-code').value.trim().toUpperCase();
  const name = document.getElementById('join-name').value.trim();
  showError('error');
  socket.emit('joinLobby', { code, name }, (res) => {
    if (res?.error) {
      showError('error', res.error);
      return;
    }
    state.lobby = res.lobby;
    state.playerId = socket.id;
    state.isHost = res.lobby.hostId === socket.id;
    Lobby.init(res.lobby);
    showScreen('lobby');
  });
});

socket.on('lobbyUpdated', (data) => {
  if (state.lobby?.code === data.code) {
    state.lobby.players = data.players;
    state.lobby.hostId = data.hostId;
    state.isHost = data.hostId === socket.id;
    Lobby.update(data);
  }
});

socket.on('lobbyClosed', () => {
  state.lobby = null;
  showScreen('landing');
  showError('lobby-error', 'Lobby was closed.');
});

socket.on('gameStarted', (data) => {
  state.gameId = data.gameId;
  state.lobby = null;
  Game.init(data);
  showScreen('game');
});

socket.on('choicesRevealed', (data) => {
  Game.showChoices(data.choices);
});

socket.on('cardRevealed', (data) => {
  Game.showCard(data);
});

socket.on('gameOver', (data) => {
  Game.showGameOver(data);
});
