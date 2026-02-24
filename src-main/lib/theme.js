/**
 * Theme values and effective theme logic. Testable without Electron.
 */

const THEME_VALUES = ['dark', 'light', 'system'];

function isValidTheme(theme) {
  return THEME_VALUES.includes(theme);
}

function getEffectiveTheme(themeSetting, systemPrefersDark) {
  if (themeSetting === 'system') return systemPrefersDark ? 'dark' : 'light';
  return themeSetting;
}

module.exports = { THEME_VALUES, isValidTheme, getEffectiveTheme };
