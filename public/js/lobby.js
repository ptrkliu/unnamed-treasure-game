const Lobby = {
  init(data) {
    document.getElementById('lobby-code').textContent = formatLobbyCode(data.code);
    this.renderPlayers(data.players || []);
    const startBtn = document.getElementById('start-game');
    startBtn.classList.toggle('hidden', !state.isHost);
    startBtn.disabled = !canStartGame(data.players);
    const artifactWrap = document.getElementById('artifact-toggle-wrap');
    if (artifactWrap) artifactWrap.classList.toggle('hidden', !state.isHost);
    const multiplierWrap = document.getElementById('multiplier-toggle-wrap');
    if (multiplierWrap) multiplierWrap.classList.toggle('hidden', !state.isHost);
    showError('lobby-error');
  },

  update(data) {
    this.renderPlayers(data.players || []);
    const startBtn = document.getElementById('start-game');
    startBtn.classList.toggle('hidden', !state.isHost);
    startBtn.disabled = !canStartGame(data.players);
    const artifactWrap = document.getElementById('artifact-toggle-wrap');
    if (artifactWrap) artifactWrap.classList.toggle('hidden', !state.isHost);
    const multiplierWrap = document.getElementById('multiplier-toggle-wrap');
    if (multiplierWrap) multiplierWrap.classList.toggle('hidden', !state.isHost);
  },

  renderPlayers(players) {
    const list = document.getElementById('player-list');
    list.innerHTML = formatPlayerList(
      players,
      state.playerId,
      state.lobby?.hostId
    );
  },
};

document.getElementById('copy-code')?.addEventListener('click', () => {
  const code = document.getElementById('lobby-code').textContent;
  navigator.clipboard?.writeText(code).then(() => {
    const btn = document.getElementById('copy-code');
    const orig = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => (btn.textContent = orig), 1500);
  });
});

document.getElementById('start-game')?.addEventListener('click', () => {
  showError('lobby-error');
  const artifactEnabled = document.getElementById('artifact-toggle')?.checked ?? false;
  const multiplierEnabled = document.getElementById('multiplier-toggle')?.checked ?? false;
  socket.emit('startGame', { artifactEnabled, multiplierEnabled }, (res) => {
    if (res?.error) showError('lobby-error', res.error);
  });
});

document.getElementById('leave-lobby')?.addEventListener('click', () => {
  socket.emit('leaveLobby', {}, () => {
    state.lobby = null;
    showScreen('landing');
  });
});
