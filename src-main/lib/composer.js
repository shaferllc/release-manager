/**
 * Composer (PHP) helpers: read composer.json/lock, parse outdated/audit/validate output.
 */

const path = require('path');

/**
 * Read composer.json and optionally composer.lock from dirPath.
 * @param {string} dirPath
 * @param {object} fsImpl - optional fs for testing
 * @returns {{ ok: boolean, hasLock?: boolean, requireCount?: number, requireDevCount?: number, phpRequire?: string, license?: string, description?: string, scripts?: string[], error?: string }}
 */
function getComposerManifestInfo(dirPath, fsImpl) {
  const fsMod = fsImpl || require('fs');
  const pathMod = path;
  const composerPath = pathMod.join(dirPath, 'composer.json');
  const lockPath = pathMod.join(dirPath, 'composer.lock');
  try {
    if (!fsMod.existsSync(composerPath)) {
      return { ok: false, error: 'composer.json not found' };
    }
    const content = fsMod.readFileSync(composerPath, 'utf8');
    let data;
    try {
      data = JSON.parse(content);
    } catch {
      return { ok: false, error: 'Invalid composer.json' };
    }
    const requireCount = typeof data.require === 'object' && data.require !== null
      ? Object.keys(data.require).length
      : 0;
    const requireDevCount = typeof data['require-dev'] === 'object' && data['require-dev'] !== null
      ? Object.keys(data['require-dev']).length
      : 0;
    const hasLock = fsMod.existsSync(lockPath);
    let phpRequire = null;
    if (typeof data.require === 'object' && data.require !== null && typeof data.require.php === 'string') {
      phpRequire = data.require.php.trim();
    }
    let license = null;
    if (Array.isArray(data.license)) {
      license = data.license.length ? data.license.join(', ') : null;
    } else if (typeof data.license === 'string' && data.license.trim()) {
      license = data.license.trim();
    }
    const description = typeof data.description === 'string' && data.description.trim() ? data.description.trim() : null;
    let scripts = [];
    if (typeof data.scripts === 'object' && data.scripts !== null && !Array.isArray(data.scripts)) {
      scripts = Object.keys(data.scripts).filter((k) => typeof k === 'string' && k.trim());
    }
    return {
      ok: true,
      hasLock,
      requireCount,
      requireDevCount,
      phpRequire: phpRequire || undefined,
      license: license || undefined,
      description: description || undefined,
      scripts: scripts.length ? scripts : undefined,
    };
  } catch (e) {
    return { ok: false, error: e.message || 'Failed to read composer manifest' };
  }
}

/**
 * Parse output from `composer validate`. Detects valid/invalid and lock file out of date.
 * @param {string} stdout
 * @param {string} stderr
 * @param {number} exitCode
 * @returns {{ valid: boolean, lockOutOfDate?: boolean, message?: string }}
 */
function parseComposerValidateOutput(stdout, stderr, exitCode) {
  const out = [stdout, stderr].filter(Boolean).join('\n').trim();
  const lockOutOfDate = /lock file (?:is )?not up to date|lockfile (?:is )?not (?:up )?to date/i.test(out);
  return {
    valid: exitCode === 0,
    lockOutOfDate: lockOutOfDate || undefined,
    message: out || undefined,
  };
}

/**
 * Parse stdout from `composer audit --format=json`.
 * Returns { advisories: { package: [ { advisory, ... } ] } } or similar.
 * @param {string} stdout
 * @returns {{ ok: boolean, advisories?: Array<{ name: string, version?: string, advisory: string, severity?: string, link?: string }>, error?: string }}
 */
function parseComposerAuditJson(stdout) {
  if (typeof stdout !== 'string') {
    return { ok: false, error: 'No output from composer audit' };
  }
  const trimmed = stdout.trim();
  if (!trimmed) {
    return { ok: true, advisories: [] };
  }
  try {
    const data = JSON.parse(trimmed);
    const advisories = [];
    if (data.advisories && typeof data.advisories === 'object') {
      for (const [name, list] of Object.entries(data.advisories)) {
        let items;
        if (Array.isArray(list)) items = list;
        else if (list) items = [list];
        else items = [];
        for (const a of items) {
          const version = a.packageVersion != null ? String(a.packageVersion) : undefined;
          const advisory = typeof a.advisory === 'string' ? a.advisory : (a.title || 'Security advisory');
          const severity = typeof a.severity === 'string' ? a.severity : undefined;
          const link = typeof a.url === 'string' ? a.url : undefined;
          advisories.push({
            name: String(name),
            version,
            advisory,
            severity,
            link,
          });
        }
      }
    }
    return { ok: true, advisories };
  } catch (_) {
    return { ok: false, error: 'Invalid JSON from composer audit' };
  }
}

/**
 * Parse stdout from `composer outdated --format=json`.
 * Composer returns { "installed": [ { "name", "version", "latest", "latest-status", "description" }, ... ] }.
 * @param {string} stdout
 * @returns {{ ok: boolean, packages?: Array<{ name: string, version: string, latest: string, latestStatus: string }>, error?: string }}
 */
function parseComposerOutdatedJson(stdout) {
  if (typeof stdout !== 'string') {
    return { ok: false, error: 'No output from composer outdated' };
  }
  const trimmed = stdout.trim();
  if (!trimmed) {
    return { ok: true, packages: [] };
  }
  try {
    const data = JSON.parse(trimmed);
    const installed = Array.isArray(data.installed) ? data.installed : [];
    const packages = installed.map((p) => ({
      name: typeof p.name === 'string' ? p.name : '',
      version: typeof p.version === 'string' ? p.version : '—',
      latest: typeof p.latest === 'string' ? p.latest : '—',
      latestStatus: typeof p['latest-status'] === 'string' ? p['latest-status'] : '',
    })).filter((p) => p.name);
    return { ok: true, packages };
  } catch (_) {
    return { ok: false, error: 'Invalid JSON from composer outdated' };
  }
}

module.exports = {
  getComposerManifestInfo,
  parseComposerOutdatedJson,
  parseComposerValidateOutput,
  parseComposerAuditJson,
};
