/**
 * Parse old JSON config for migration. Testable without Electron.
 */

function parseOldConfig(jsonString) {
  if (!jsonString || typeof jsonString !== 'string') return {};
  try {
    const data = JSON.parse(jsonString);
    const out = {};
    if (Array.isArray(data.projects)) out.projects = data.projects;
    if (data.theme && typeof data.theme === 'string') out.theme = data.theme;
    return out;
  } catch {
    return {};
  }
}

module.exports = { parseOldConfig };
