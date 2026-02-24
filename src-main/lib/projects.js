/**
 * Project list filtering. Testable without Electron.
 */

function filterValidProjects(list) {
  if (!Array.isArray(list)) return [];
  return list.filter((p) => p && typeof p.path === 'string' && p.path.trim() !== '');
}

module.exports = { filterValidProjects };
