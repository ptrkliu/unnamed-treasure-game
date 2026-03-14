/**
 * @jest-environment jsdom
 */

const { updateChoiceUI } = require('../public/js/choice-ui');

function setupDOM() {
  document.body.innerHTML = `
    <div id="game-status"></div>
    <div id="game-choices">
      <button id="btn-stay" class="choice-btn">Stay</button>
      <button id="btn-leave" class="choice-btn">Leave</button>
    </div>
  `;
}

describe('updateChoiceUI (vote change feature)', () => {
  beforeEach(setupDOM);

  it('clears selection and shows prompt when choice is null', () => {
    updateChoiceUI(null, document);
    expect(document.getElementById('btn-stay').classList.contains('selected')).toBe(false);
    expect(document.getElementById('btn-leave').classList.contains('selected')).toBe(false);
    expect(document.getElementById('game-status').textContent).toBe('Choose: Stay or Leave?');
  });

  it('highlights Stay and updates status when choice is stay', () => {
    updateChoiceUI('stay', document);
    expect(document.getElementById('btn-stay').classList.contains('selected')).toBe(true);
    expect(document.getElementById('btn-leave').classList.contains('selected')).toBe(false);
    expect(document.getElementById('game-status').textContent).toContain('You chose Stay');
    expect(document.getElementById('game-status').textContent).toContain('click to change');
  });

  it('highlights Leave and updates status when choice is leave', () => {
    updateChoiceUI('leave', document);
    expect(document.getElementById('btn-stay').classList.contains('selected')).toBe(false);
    expect(document.getElementById('btn-leave').classList.contains('selected')).toBe(true);
    expect(document.getElementById('game-status').textContent).toContain('You chose Leave');
    expect(document.getElementById('game-status').textContent).toContain('click to change');
  });

  it('allows changing from stay to leave', () => {
    updateChoiceUI('stay', document);
    expect(document.getElementById('btn-stay').classList.contains('selected')).toBe(true);
    updateChoiceUI('leave', document);
    expect(document.getElementById('btn-stay').classList.contains('selected')).toBe(false);
    expect(document.getElementById('btn-leave').classList.contains('selected')).toBe(true);
    expect(document.getElementById('game-status').textContent).toContain('You chose Leave');
  });

  it('allows changing from leave to stay', () => {
    updateChoiceUI('leave', document);
    expect(document.getElementById('btn-leave').classList.contains('selected')).toBe(true);
    updateChoiceUI('stay', document);
    expect(document.getElementById('btn-leave').classList.contains('selected')).toBe(false);
    expect(document.getElementById('btn-stay').classList.contains('selected')).toBe(true);
    expect(document.getElementById('game-status').textContent).toContain('You chose Stay');
  });
});
