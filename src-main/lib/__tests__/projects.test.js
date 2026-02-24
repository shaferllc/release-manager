const { filterValidProjects } = require('../projects');

describe('projects', () => {
  describe('filterValidProjects', () => {
    it('returns empty array for non-array input', () => {
      expect(filterValidProjects(null)).toEqual([]);
      expect(filterValidProjects(undefined)).toEqual([]);
      expect(filterValidProjects({})).toEqual([]);
      expect(filterValidProjects('')).toEqual([]);
    });

    it('returns only entries with non-empty path string', () => {
      const list = [
        { path: '/valid', name: 'Valid' },
        { path: '', name: 'Empty' },
        { path: '  ', name: 'Blank' },
        null,
        { name: 'NoPath' },
        { path: '/also-valid' },
      ];
      expect(filterValidProjects(list)).toEqual([
        { path: '/valid', name: 'Valid' },
        { path: '/also-valid' },
      ]);
    });

    it('returns empty array for empty list', () => {
      expect(filterValidProjects([])).toEqual([]);
    });

    it('keeps all valid entries', () => {
      const list = [
        { path: '/a', name: 'A' },
        { path: 'C:\\b', name: 'B' },
      ];
      expect(filterValidProjects(list)).toHaveLength(2);
    });
  });
});
