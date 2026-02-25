const {
  getNpmScriptNames,
  getComposerScriptNames,
  getCoverageScriptNameNpm,
  getCoverageScriptNameComposer,
} = require('../projectTestScripts');

describe('projectTestScripts', () => {
  describe('getNpmScriptNames', () => {
    it('returns error for empty or non-string', () => {
      expect(getNpmScriptNames('').ok).toBe(false);
      expect(getNpmScriptNames(null).ok).toBe(false);
      expect(getNpmScriptNames(undefined).ok).toBe(false);
    });

    it('returns error for invalid JSON', () => {
      const r = getNpmScriptNames('{ invalid }');
      expect(r.ok).toBe(false);
      expect(r.error).toBeDefined();
    });

    it('returns empty scripts when no scripts key', () => {
      const r = getNpmScriptNames('{"name":"pkg"}');
      expect(r.ok).toBe(true);
      expect(r.scripts).toEqual([]);
    });

    it('returns all script names', () => {
      const r = getNpmScriptNames(JSON.stringify({
        name: 'app',
        scripts: { test: 'jest', start: 'node .', 'test:coverage': 'jest --coverage' },
      }));
      expect(r.ok).toBe(true);
      expect(r.scripts).toEqual(['test', 'start', 'test:coverage']);
    });
  });

  describe('getComposerScriptNames', () => {
    it('returns empty scripts for null or non-ok manifest', () => {
      expect(getComposerScriptNames(null)).toEqual({ ok: true, scripts: [] });
      expect(getComposerScriptNames({ ok: false })).toEqual({ ok: true, scripts: [] });
    });

    it('returns scripts from manifest', () => {
      expect(getComposerScriptNames({ ok: true, scripts: ['test', 'cs-fix'] })).toEqual({
        ok: true,
        scripts: ['test', 'cs-fix'],
      });
    });
  });

  describe('getCoverageScriptNameNpm', () => {
    it('returns null for missing or non-object scripts', () => {
      expect(getCoverageScriptNameNpm(null)).toBeNull();
      expect(getCoverageScriptNameNpm(undefined)).toBeNull();
      expect(getCoverageScriptNameNpm({})).toBeNull();
    });

    it('returns "coverage" when present', () => {
      expect(getCoverageScriptNameNpm({ coverage: 'jest --coverage' })).toBe('coverage');
    });

    it('returns "test:coverage" when coverage missing but test:coverage present', () => {
      expect(getCoverageScriptNameNpm({ test: 'jest', 'test:coverage': 'jest --coverage' })).toBe('test:coverage');
    });

    it('returns null when neither coverage nor test:coverage', () => {
      expect(getCoverageScriptNameNpm({ test: 'jest', start: 'node .' })).toBeNull();
    });
  });

  describe('getCoverageScriptNameComposer', () => {
    it('returns null for empty or non-array', () => {
      expect(getCoverageScriptNameComposer([])).toBeNull();
      expect(getCoverageScriptNameComposer(null)).toBeNull();
    });

    it('returns "coverage" when in list', () => {
      expect(getCoverageScriptNameComposer(['test', 'coverage'])).toBe('coverage');
    });

    it('returns first script name containing "coverage" when no exact match', () => {
      expect(getCoverageScriptNameComposer(['test', 'test:coverage'])).toBe('test:coverage');
    });

    it('returns null when no coverage-related script', () => {
      expect(getCoverageScriptNameComposer(['test', 'cs-fix'])).toBeNull();
    });
  });
});
