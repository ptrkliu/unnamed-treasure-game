/**
 * Pure formatting logic for the game tracker (treasures and hazards).
 * Used by renderTracker in game.js; testable without DOM.
 */
function formatTrackerContent(hazardCounts = {}, treasuresRevealed = [], artifactPool = 0, treasureMultiplier = 1) {
  const treasures =
    treasuresRevealed.length > 0
      ? [...treasuresRevealed].sort((a, b) => a - b).join(', ')
      : 'None yet';
  const hazards = Object.entries(hazardCounts)
    .filter(([, count]) => count > 0)
    .map(
      ([hazard, count]) =>
        `${hazard.charAt(0).toUpperCase() + hazard.slice(1)}: ${count}`
    )
    .join(' | ');
  const artifactLine =
    artifactPool > 0
      ? `<p class="tracker-artifacts"><strong>Artifact pool:</strong> ${artifactPool}</p>`
      : '';
  const multiplierLine =
    treasureMultiplier > 1
      ? `<p class="tracker-multiplier"><strong>Treasure multiplier:</strong> ${treasureMultiplier}×</p>`
      : '';
  return `
      <p class="tracker-treasures"><strong>Treasures:</strong> ${treasures}</p>
      <p class="tracker-hazards"><strong>Hazards:</strong> ${hazards || 'None yet'}</p>
      ${artifactLine}
      ${multiplierLine}
    `;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { formatTrackerContent };
} else {
  window.formatTrackerContent = formatTrackerContent;
}
