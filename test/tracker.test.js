const { formatTrackerContent } = require('../public/js/tracker');

describe('formatTrackerContent', () => {
  it('shows "None yet" for treasures when empty', () => {
    const html = formatTrackerContent({}, []);
    expect(html).toContain('<strong>Treasures:</strong> None yet');
  });

  it('shows "None yet" for hazards when empty', () => {
    const html = formatTrackerContent({}, []);
    expect(html).toContain('<strong>Hazards:</strong> None yet');
  });

  it('sorts and formats treasures as comma-separated values', () => {
    const html = formatTrackerContent({}, [15, 7, 10]);
    expect(html).toContain('<strong>Treasures:</strong> 7, 10, 15');
  });

  it('handles single treasure', () => {
    const html = formatTrackerContent({}, [12]);
    expect(html).toContain('<strong>Treasures:</strong> 12');
  });

  it('formats hazards with capitalized names and counts', () => {
    const html = formatTrackerContent({ snakes: 1, spiders: 2 }, []);
    expect(html).toContain('<strong>Hazards:</strong> Snakes: 1 | Spiders: 2');
  });

  it('handles single hazard', () => {
    const html = formatTrackerContent({ mummies: 1 }, []);
    expect(html).toContain('<strong>Hazards:</strong> Mummies: 1');
  });

  it('filters out hazards with zero count', () => {
    const html = formatTrackerContent({ snakes: 1, spiders: 0, mummies: 2 }, []);
    expect(html).toContain('Snakes: 1');
    expect(html).toContain('Mummies: 2');
    expect(html).not.toContain('Spiders: 0');
  });

  it('combines treasures and hazards', () => {
    const html = formatTrackerContent(
      { jaguars: 1 },
      [5, 10, 15]
    );
    expect(html).toContain('<strong>Treasures:</strong> 5, 10, 15');
    expect(html).toContain('<strong>Hazards:</strong> Jaguars: 1');
  });

  it('handles undefined hazardCounts and treasuresRevealed', () => {
    const html = formatTrackerContent();
    expect(html).toContain('<strong>Treasures:</strong> None yet');
    expect(html).toContain('<strong>Hazards:</strong> None yet');
  });

  it('includes tracker-treasures and tracker-hazards CSS classes', () => {
    const html = formatTrackerContent({ snakes: 1 }, [10]);
    expect(html).toContain('tracker-treasures');
    expect(html).toContain('tracker-hazards');
  });

  it('shows artifact pool when greater than zero', () => {
    const html = formatTrackerContent({}, [], 24);
    expect(html).toContain('<strong>Artifact pool:</strong> 24');
    expect(html).toContain('tracker-artifacts');
  });

  it('omits artifact pool when zero', () => {
    const html = formatTrackerContent({}, [], 0);
    expect(html).not.toContain('Artifact pool');
  });

  it('shows treasure multiplier when greater than 1', () => {
    const html = formatTrackerContent({}, [10], 0, 2);
    expect(html).toContain('<strong>Treasure multiplier:</strong> 2×');
    expect(html).toContain('tracker-multiplier');
  });

  it('omits treasure multiplier when 1', () => {
    const html = formatTrackerContent({}, [10], 0, 1);
    expect(html).not.toContain('Treasure multiplier');
  });

  it('handles undefined treasureMultiplier (defaults to 1)', () => {
    const html = formatTrackerContent({}, [10], 0);
    expect(html).not.toContain('Treasure multiplier');
  });

  it('shows player scaling when greater than 1', () => {
    const html = formatTrackerContent({}, [10], 0, 1, 2);
    expect(html).toContain('<strong>Player scaling:</strong> 2×');
    expect(html).toContain('tracker-player-scale');
  });

  it('omits player scaling when 1', () => {
    const html = formatTrackerContent({}, [10], 0, 1, 1);
    expect(html).not.toContain('Player scaling');
  });
});
