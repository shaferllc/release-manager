/**
 * Project test/coverage script discovery. Testable without Electron or fs.
 */

/**
 * Get script names from package.json content (npm).
 * @param {string} content - Raw package.json content
 * @returns {{ ok: boolean, scripts?: string[], error?: string }}
 */
function getNpmScriptNames(content) {
  if (!content || typeof content !== 'string') return { ok: false, error: 'No content' };
  let data;
  try {
    data = JSON.parse(content);
  } catch {
    return { ok: false, error: 'Invalid JSON' };
  }
  const scripts = typeof data.scripts === 'object' && data.scripts !== null ? Object.keys(data.scripts) : [];
  return { ok: true, scripts };
}

/**
 * Get script names from composer manifest result (PHP).
 * @param {{ ok: boolean, scripts?: string[] }} manifest - Result of getComposerManifestInfo
 * @returns {{ ok: boolean, scripts: string[] }}
 */
function getComposerScriptNames(manifest) {
  if (!manifest || !manifest.ok || !Array.isArray(manifest.scripts)) return { ok: true, scripts: [] };
  return { ok: true, scripts: manifest.scripts };
}

/**
 * Pick npm script name for coverage: 'coverage' or 'test:coverage', else null.
 * @param {{ [k: string]: string }} scripts - package.json scripts object
 * @returns {string|null}
 */
function getCoverageScriptNameNpm(scripts) {
  if (!scripts || typeof scripts !== 'object') return null;
  if (typeof scripts.coverage === 'string') return 'coverage';
  if (typeof scripts['test:coverage'] === 'string') return 'test:coverage';
  return null;
}

/**
 * Pick composer script name for coverage: 'coverage' or first name containing 'coverage'.
 * @param {string[]} scriptNames - Composer script names
 * @returns {string|null}
 */
function getCoverageScriptNameComposer(scriptNames) {
  if (!Array.isArray(scriptNames) || scriptNames.length === 0) return null;
  if (scriptNames.includes('coverage')) return 'coverage';
  const found = scriptNames.find((s) => String(s).toLowerCase().includes('coverage'));
  return found !== undefined ? found : null;
}

module.exports = {
  getNpmScriptNames,
  getComposerScriptNames,
  getCoverageScriptNameNpm,
  getCoverageScriptNameComposer,
};
