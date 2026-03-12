const { getShortcutAction } = require('../shortcuts');

describe('shortcuts', () => {
  const mod = (meta = true, ctrl = false) => ({ metaKey: meta, ctrlKey: ctrl });

  describe('getShortcutAction', () => {
    it('returns null when not in detail view', () => {
      expect(getShortcutAction('dashboard', '/path', '1', true, false, false)).toBeNull();
      expect(getShortcutAction('settings', '/path', 's', true, false, false)).toBeNull();
    });

    it('returns null when no project selected', () => {
      expect(getShortcutAction('detail', null, '1', true, false, false)).toBeNull();
      expect(getShortcutAction('detail', '', 's', true, false, false)).toBeNull();
    });

    it('returns null when modifier not pressed', () => {
      expect(getShortcutAction('detail', '/path', '1', false, false, false)).toBeNull();
    });

    it('returns release-patch for Cmd/Ctrl+1 when not in input', () => {
      expect(getShortcutAction('detail', '/path', '1', true, false, false)).toBe('release-patch');
      expect(getShortcutAction('detail', '/path', '1', false, true, false)).toBe('release-patch');
    });

    it('returns release-minor for Cmd/Ctrl+2', () => {
      expect(getShortcutAction('detail', '/path', '2', true, false, false)).toBe('release-minor');
    });

    it('returns release-major for Cmd/Ctrl+3', () => {
      expect(getShortcutAction('detail', '/path', '3', true, false, false)).toBe('release-major');
    });

    it('returns null for 1/2/3 when in input', () => {
      expect(getShortcutAction('detail', '/path', '1', true, false, true)).toBeNull();
      expect(getShortcutAction('detail', '/path', '2', true, false, true)).toBeNull();
      expect(getShortcutAction('detail', '/path', '3', true, false, true)).toBeNull();
    });

    it('returns sync for Cmd/Ctrl+S', () => {
      expect(getShortcutAction('detail', '/path', 's', true, false, false)).toBe('sync');
      expect(getShortcutAction('detail', '/path', 's', false, true, false)).toBe('sync');
    });

    it('returns download-latest for Cmd/Ctrl+D', () => {
      expect(getShortcutAction('detail', '/path', 'd', true, false, false)).toBe('download-latest');
    });

    it('returns codeseer-clear for Cmd+K when on codeseer tab', () => {
      expect(getShortcutAction('detail', '/path', 'k', true, false, false, 'codeseer')).toBe('codeseer-clear');
      expect(getShortcutAction('detail', '/path', 'k', false, true, false, 'codeseer')).toBe('codeseer-clear');
    });
    it('returns null for Cmd+K when not on codeseer tab', () => {
      expect(getShortcutAction('detail', '/path', 'k', true, false, false, 'git')).toBeNull();
      expect(getShortcutAction('detail', '/path', 'k', true, false, false)).toBeNull();
    });

    it('returns focus-git-filter for Cmd+Alt+F when on git tab', () => {
      expect(getShortcutAction('detail', '/path', 'f', true, false, false, 'git', true)).toBe('focus-git-filter');
      expect(getShortcutAction('detail', '/path', 'F', true, false, false, 'git', true)).toBe('focus-git-filter');
      expect(getShortcutAction('detail', '/path', 'f', false, true, false, 'git', true)).toBe('focus-git-filter');
    });
    it('returns null for Cmd+F without Alt when on git tab', () => {
      expect(getShortcutAction('detail', '/path', 'f', true, false, false, 'git', false)).toBeNull();
    });
    it('returns null for Cmd+Alt+F when not on git tab', () => {
      expect(getShortcutAction('detail', '/path', 'f', true, false, false, 'codeseer', true)).toBeNull();
    });

    it('returns null for other keys', () => {
      expect(getShortcutAction('detail', '/path', 'x', true, false, false)).toBeNull();
      expect(getShortcutAction('detail', '/path', 'Enter', true, false, false)).toBeNull();
    });
  });
});
