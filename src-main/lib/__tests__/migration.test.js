const { parseOldConfig } = require('../migration');

describe('migration', () => {
  describe('parseOldConfig', () => {
    it('returns empty object for invalid or empty input', () => {
      expect(parseOldConfig('')).toEqual({});
      expect(parseOldConfig(null)).toEqual({});
      expect(parseOldConfig(undefined)).toEqual({});
      expect(parseOldConfig('not json')).toEqual({});
      expect(parseOldConfig(123)).toEqual({});
    });

    it('returns empty object when JSON.parse throws', () => {
      expect(parseOldConfig('{ invalid }')).toEqual({});
    });

    it('extracts projects array', () => {
      const json = JSON.stringify({ projects: [{ path: '/a', name: 'A' }] });
      expect(parseOldConfig(json)).toEqual({ projects: [{ path: '/a', name: 'A' }] });
    });

    it('extracts theme', () => {
      const json = JSON.stringify({ theme: 'light' });
      expect(parseOldConfig(json)).toEqual({ theme: 'light' });
    });

    it('extracts both projects and theme', () => {
      const json = JSON.stringify({
        theme: 'dark',
        projects: [{ path: '/p', name: 'P' }],
      });
      expect(parseOldConfig(json)).toEqual({
        theme: 'dark',
        projects: [{ path: '/p', name: 'P' }],
      });
    });

    it('ignores non-array projects', () => {
      const json = JSON.stringify({ projects: {} });
      expect(parseOldConfig(json)).toEqual({});
    });

    it('ignores non-string theme', () => {
      const json = JSON.stringify({ theme: 123 });
      expect(parseOldConfig(json)).toEqual({});
    });

    it('ignores extra keys and extracts only projects and theme', () => {
      const json = JSON.stringify({
        projects: [{ path: '/p' }],
        theme: 'dark',
        other: 'ignored',
        githubToken: 'x',
      });
      expect(parseOldConfig(json)).toEqual({
        projects: [{ path: '/p' }],
        theme: 'dark',
      });
    });
  });
});
