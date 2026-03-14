const Game = {
  init(data) {
    this.players = data.players || [];
    this.sharedPot = data.sharedPot || 0;
    document.getElementById('game-choices').classList.add('hidden');
    document.getElementById('game-reveal').classList.add('hidden');
    document.getElementById('game-over').classList.add('hidden');
    this.renderPlayers();
    this.renderPot();
    this.renderTracker(data.hazardCounts, data.treasuresRevealed, data.artifactPool, data.treasureMultiplier ?? 1, data.playerScaleMultiplier ?? 1);
    document.getElementById('game-status').textContent = 'Choose: Stay or Leave?';
    document.getElementById('game-choices').classList.remove('hidden');
  },

  renderPlayers() {
    const el = document.getElementById('game-players');
    el.innerHTML = (this.players || [])
      .map(
        (p) =>
          `<span class="player-chip ${p.id === state.playerId ? 'you' : ''}">${p.name}: ${p.score}${p.treasuresInFront ? ` (+${p.treasuresInFront})` : ''}</span>`
      )
      .join('');
  },

  renderPot() {
    const el = document.getElementById('game-pot');
    el.textContent = this.sharedPot ? `Shared pot: ${this.sharedPot}` : '';
  },

  renderTracker(hazardCounts = {}, treasuresRevealed = [], artifactPool = 0, treasureMultiplier = 1, playerScaleMultiplier = 1) {
    const el = document.getElementById('game-tracker-content');
    el.innerHTML = formatTrackerContent(hazardCounts, treasuresRevealed, artifactPool, treasureMultiplier, playerScaleMultiplier);
  },

  showChoices(choices) {
    document.getElementById('game-choices').classList.add('hidden');
    const names = {};
    (this.players || []).forEach((p) => (names[p.id] = p.name));
    const html = Object.entries(choices || {})
      .map(
        ([id, choice]) =>
          `${names[id] || '?'}: ${choice === 'stay' ? 'Stay' : 'Leave'}`
      )
      .join('<br>');
    document.getElementById('game-reveal').innerHTML = `<p>${html}</p>`;
    document.getElementById('game-reveal').classList.remove('hidden');
  },

  showCard(data) {
    this.players = data.players || [];
    this.sharedPot = data.sharedPot || 0;
    const card = data.card;
    const isTreasure = card?.type === 'treasure';
    const isArtifact = card?.type === 'artifact';
    const isMultiplier = card?.type === 'multiplier';
    const value = isTreasure || isArtifact ? card.value : card?.hazard;
    const cls = isTreasure ? 'treasure' : isArtifact ? 'artifact' : isMultiplier ? 'multiplier' : 'hazard';
    const label = isTreasure ? `Treasure: ${value}` : isArtifact ? `Artifact: ${value}` : isMultiplier ? '2× Multiplier!' : `Hazard: ${value}`;
    document.getElementById('game-reveal').innerHTML = `
      <div class="card-reveal ${cls}">
        <strong>${label}</strong>
      </div>
    `;
    document.getElementById('game-reveal').classList.remove('hidden');
    this.renderPlayers();
    this.renderPot();
    this.renderTracker(data.hazardCounts, data.treasuresRevealed, data.artifactPool, data.treasureMultiplier, data.playerScaleMultiplier ?? 1);

    const active = (this.players || []).filter(
      (p) => p.status === 'active' && !p.leftThisTurn
    );
    const canPlay = active.some((p) => p.id === state.playerId);

    if (canPlay && data.turnPhase === 'choosing') {
      document.getElementById('game-status').textContent =
        'Choose: Stay or Leave?';
      document.getElementById('game-choices').classList.remove('hidden');
    } else if (!canPlay) {
      document.getElementById('game-status').textContent =
        'You are out this round. Waiting...';
    }
  },

  showGameOver(data) {
    document.getElementById('game-choices').classList.add('hidden');
    document.getElementById('game-reveal').classList.add('hidden');
    this.renderTracker(data.hazardCounts || {}, data.treasuresRevealed || [], data.artifactPool, data.treasureMultiplier ?? 1, data.playerScaleMultiplier ?? 1);
    const scores = data.finalScores || [];
    const winner = scores[0];
    const hasMoreRounds = data.hasMoreRounds === true;
    const roundNumber = data.roundNumber ?? 1;
    const totalRounds = data.totalRounds ?? 5;
    const artifactEnabled = data.artifactEnabled ?? false;
    const multiplierEnabled = data.multiplierEnabled ?? false;
    const endingMsg = data.endingHazard
      ? `The round ended when the second <strong>${data.endingHazard.charAt(0).toUpperCase() + data.endingHazard.slice(1)}</strong> appeared!`
      : '';
    const heading = hasMoreRounds
      ? `Round ${roundNumber} of ${totalRounds} Complete`
      : 'Game Complete';
    const isHost = state.playerId === data.hostId;
    const artifactCheckbox =
      hasMoreRounds && isHost
        ? `<label class="block"><input type="checkbox" id="next-round-artifact-toggle" ${artifactEnabled ? 'checked' : ''} /> Include artifacts next round</label>`
        : '';
    const multiplierCheckbox =
      hasMoreRounds && isHost
        ? `<label class="block"><input type="checkbox" id="next-round-multiplier-toggle" ${multiplierEnabled ? 'checked' : ''} /> Include 2× multiplier card next round</label>`
        : '';
    const nextRoundBtn =
      hasMoreRounds && isHost
        ? '<button id="btn-next-round" type="button" class="primary">Next Round</button>'
        : '';
    const html = `
      <h2>${heading}</h2>
      ${endingMsg ? `<p>${endingMsg}</p>` : ''}
      <p>${hasMoreRounds ? 'Leader' : 'Winner'}: ${winner?.name || '?'} (${winner?.score ?? 0} points)</p>
      <ol>
        ${scores.map((s) => `<li>${s.name}: ${s.score}</li>`).join('')}
      </ol>
      ${artifactCheckbox}
      ${multiplierCheckbox}
      ${nextRoundBtn}
    `;
    document.getElementById('game-over').innerHTML = html;
    document.getElementById('game-over').classList.remove('hidden');
    document.getElementById('game-status').textContent = '';

    document.getElementById('btn-next-round')?.addEventListener('click', () => {
      const nextArtifactEnabled = document.getElementById('next-round-artifact-toggle')?.checked ?? false;
      const nextMultiplierEnabled = document.getElementById('next-round-multiplier-toggle')?.checked ?? false;
      socket.emit('nextRound', { artifactEnabled: nextArtifactEnabled, multiplierEnabled: nextMultiplierEnabled }, (res) => {
        if (res?.error) return;
      });
    });
  },
};

document.getElementById('btn-stay')?.addEventListener('click', () => {
  socket.emit('playerChoice', { choice: 'stay' }, (res) => {
    if (res?.error) return;
    document.getElementById('game-choices').classList.add('hidden');
    document.getElementById('game-status').textContent = 'Waiting for others...';
  });
});

document.getElementById('btn-leave')?.addEventListener('click', () => {
  socket.emit('playerChoice', { choice: 'leave' }, (res) => {
    if (res?.error) return;
    document.getElementById('game-choices').classList.add('hidden');
    document.getElementById('game-status').textContent = 'You left. Waiting...';
  });
});
