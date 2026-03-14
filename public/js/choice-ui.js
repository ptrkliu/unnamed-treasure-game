/**
 * Updates the stay/leave choice UI (buttons and status text).
 * @param {string|null} choice - 'stay', 'leave', or null to clear
 * @param {Document} [doc] - Document (for testing); uses global document if omitted
 */
function updateChoiceUI(choice, doc) {
  const document = doc ?? (typeof globalThis.document !== 'undefined' ? globalThis.document : null);
  if (!document) return;
  const stayBtn = document.getElementById('btn-stay');
  const leaveBtn = document.getElementById('btn-leave');
  if (!stayBtn || !leaveBtn) return;
  stayBtn.classList.toggle('selected', choice === 'stay');
  leaveBtn.classList.toggle('selected', choice === 'leave');
  const status = document.getElementById('game-status');
  if (status) {
    status.textContent =
      choice === 'stay'
        ? 'You chose Stay. Waiting for others... (click to change)'
        : choice === 'leave'
          ? 'You chose Leave. Waiting for others... (click to change)'
          : 'Choose: Stay or Leave?';
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { updateChoiceUI };
} else if (typeof globalThis !== 'undefined') {
  globalThis.updateChoiceUI = updateChoiceUI;
}

