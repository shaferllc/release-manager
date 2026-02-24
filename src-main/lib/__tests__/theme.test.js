const { THEME_VALUES, isValidTheme, getEffectiveTheme } = require('../theme');

describe('theme', () => {
  describe('THEME_VALUES', () => {
    it('includes dark, light, system', () => {
      expect(THEME_VALUES).toContain('dark');
      expect(THEME_VALUES).toContain('light');
      expect(THEME_VALUES).toContain('system');
      expect(THEME_VALUES).toHaveLength(3);
    });
  });

  describe('isValidTheme', () => {
    it('returns true for dark, light, system', () => {
      expect(isValidTheme('dark')).toBe(true);
      expect(isValidTheme('light')).toBe(true);
      expect(isValidTheme('system')).toBe(true);
    });

    it('returns false for invalid values', () => {
      expect(isValidTheme('')).toBe(false);
      expect(isValidTheme('auto')).toBe(false);
      expect(isValidTheme(null)).toBe(false);
      expect(isValidTheme(undefined)).toBe(false);
    });
  });

  describe('getEffectiveTheme', () => {
    it('returns setting when dark or light', () => {
      expect(getEffectiveTheme('dark', true)).toBe('dark');
      expect(getEffectiveTheme('dark', false)).toBe('dark');
      expect(getEffectiveTheme('light', true)).toBe('light');
      expect(getEffectiveTheme('light', false)).toBe('light');
    });

    it('returns system preference when theme is system', () => {
      expect(getEffectiveTheme('system', true)).toBe('dark');
      expect(getEffectiveTheme('system', false)).toBe('light');
    });

    it('returns setting as-is when not dark/light/system', () => {
      expect(getEffectiveTheme('auto', true)).toBe('auto');
      expect(getEffectiveTheme('', false)).toBe('');
    });
  });
});
