const { BUMP_VALUES, PRERELEASE_PREID, isValidBump, isPrereleaseBump, formatTag } = require('../version');

describe('version', () => {
  describe('BUMP_VALUES', () => {
    it('includes patch, minor, major', () => {
      expect(BUMP_VALUES).toContain('patch');
      expect(BUMP_VALUES).toContain('minor');
      expect(BUMP_VALUES).toContain('major');
    });
  });

  describe('isValidBump', () => {
    it('returns true for patch, minor, major', () => {
      expect(isValidBump('patch')).toBe(true);
      expect(isValidBump('minor')).toBe(true);
      expect(isValidBump('major')).toBe(true);
    });

    it('returns false for invalid values', () => {
      expect(isValidBump('')).toBe(false);
      expect(isValidBump('premajor')).toBe(false);
      expect(isValidBump('prerelease')).toBe(false);
      expect(isValidBump(null)).toBe(false);
    });
  });

  describe('isPrereleaseBump', () => {
    it('returns true for prerelease', () => {
      expect(isPrereleaseBump('prerelease')).toBe(true);
    });
    it('returns false for patch, minor, major and others', () => {
      expect(isPrereleaseBump('patch')).toBe(false);
      expect(isPrereleaseBump('minor')).toBe(false);
      expect(isPrereleaseBump('')).toBe(false);
    });
  });

  describe('PRERELEASE_PREID', () => {
    it('is beta', () => {
      expect(PRERELEASE_PREID).toBe('beta');
    });
  });

  describe('formatTag', () => {
    it('adds v prefix when missing', () => {
      expect(formatTag('1.0.0')).toBe('v1.0.0');
      expect(formatTag('0.1.2')).toBe('v0.1.2');
    });

    it('leaves v prefix when present', () => {
      expect(formatTag('v1.0.0')).toBe('v1.0.0');
    });

    it('returns null for empty or non-string', () => {
      expect(formatTag('')).toBe(null);
      expect(formatTag(null)).toBe(null);
      expect(formatTag(undefined)).toBe(null);
    });
  });
});
