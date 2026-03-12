/**
 * Keyboard shortcut action for project detail view. Testable without DOM.
 * Returns action string or null.
 * @param {string} viewMode - 'detail' | 'dashboard' | ...
 * @param {string|null} selectedPath - Project path
 * @param {string} key - Key pressed
 * @param {boolean} metaKey - meta/Cmd
 * @param {boolean} ctrlKey - Ctrl
 * @param {boolean} inInput - Focus in input
 * @param {string} [detailTab] - Active detail tab (e.g. 'codeseer', 'git')
 * @param {boolean} [altKey] - Alt/Option key
 */
function getShortcutAction(viewMode, selectedPath, key, metaKey, ctrlKey, inInput, detailTab, altKey) {
  if (viewMode !== 'detail' || !selectedPath) return null;
  const isMod = metaKey || ctrlKey;
  if (!isMod) return null;
  if (key === 'k' && !inInput && detailTab === 'codeseer') return 'codeseer-clear';
  if ((key === 'f' || key === 'F') && altKey && !inInput && detailTab === 'git') return 'focus-git-filter';
  if (key === '1' && !inInput) return 'release-patch';
  if (key === '2' && !inInput) return 'release-minor';
  if (key === '3' && !inInput) return 'release-major';
  if (key === 's') return 'sync';
  if (key === 'd') return 'download-latest';
  return null;
}

module.exports = { getShortcutAction };
