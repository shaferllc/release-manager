/**
 * Keyboard shortcut action for project detail view. Testable without DOM.
 * Returns action string or null.
 */

function getShortcutAction(viewMode, selectedPath, key, metaKey, ctrlKey, inInput) {
  if (viewMode !== 'detail' || !selectedPath) return null;
  const isMod = metaKey || ctrlKey;
  if (!isMod) return null;
  if (key === '1' && !inInput) return 'release-patch';
  if (key === '2' && !inInput) return 'release-minor';
  if (key === '3' && !inInput) return 'release-major';
  if (key === 's') return 'sync';
  if (key === 'd') return 'download-latest';
  return null;
}

module.exports = { getShortcutAction };
