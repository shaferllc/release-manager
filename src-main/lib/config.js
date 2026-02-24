/**
 * Config helpers: get/set stored config and projects list.
 * Takes getConfigPath so it can be tested with a mock path.
 */

function getStoredConfig(getConfigPath, fsImpl) {
  const fsMod = fsImpl || require('fs');
  try {
    return JSON.parse(fsMod.readFileSync(getConfigPath(), 'utf8'));
  } catch {
    return {};
  }
}

function setStoredConfig(getConfigPath, updates, fsImpl) {
  const fsMod = fsImpl || require('fs');
  const data = { ...getStoredConfig(getConfigPath, fsMod), ...updates };
  fsMod.writeFileSync(getConfigPath(), JSON.stringify(data, null, 2));
}

function getProjects(getConfigPath, fsImpl) {
  const config = getStoredConfig(getConfigPath, fsImpl);
  const list = config.projects;
  if (!Array.isArray(list)) return [];
  return list.filter((p) => p && typeof p.path === 'string' && p.path.trim() !== '');
}

function setProjects(getConfigPath, projects, fsImpl) {
  setStoredConfig(getConfigPath, { projects }, fsImpl);
}

module.exports = { getStoredConfig, setStoredConfig, getProjects, setProjects };
