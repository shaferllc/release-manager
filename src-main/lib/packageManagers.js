/**
 * Detect project type and read version from Cargo.toml, go.mod, pyproject.toml, setup.py.
 * package.json is handled by packageJson.js. This module is for non-npm package managers.
 */

const fs = require('fs');
const path = require('path');

const PROJECT_TYPES = ['npm', 'cargo', 'go', 'python'];

/**
 * Detect project type by checking for manifest files. Order: package.json (caller), Cargo.toml, go.mod, pyproject.toml, setup.py.
 * @param {string} dirPath
 * @param {object} fsImpl - optional fs for testing
 * @returns {{ type: string, manifestPath: string } | null}
 */
function detectProjectType(dirPath, fsImpl) {
  const fsMod = fsImpl || fs;
  if (!dirPath || typeof dirPath !== 'string') return null;
  if (fsMod.existsSync(path.join(dirPath, 'Cargo.toml'))) {
    return { type: 'cargo', manifestPath: path.join(dirPath, 'Cargo.toml') };
  }
  if (fsMod.existsSync(path.join(dirPath, 'go.mod'))) {
    return { type: 'go', manifestPath: path.join(dirPath, 'go.mod') };
  }
  if (fsMod.existsSync(path.join(dirPath, 'pyproject.toml'))) {
    return { type: 'python', manifestPath: path.join(dirPath, 'pyproject.toml') };
  }
  if (fsMod.existsSync(path.join(dirPath, 'setup.py'))) {
    return { type: 'python', manifestPath: path.join(dirPath, 'setup.py') };
  }
  return null;
}

/**
 * Parse version from Cargo.toml. Looks for [package] version = "x.y.z".
 * @param {string} content
 * @returns {string|null}
 */
function parseCargoVersion(content) {
  if (!content || typeof content !== 'string') return null;
  const match = content.match(/^version\s*=\s*["']([^"']+)["']\s*$/m);
  return match ? match[1].trim() : null;
}

/**
 * Parse version from go.mod. Go modules don't have a version field; we return null (use git tags).
 * @returns {null}
 */
function parseGoVersion() {
  return null;
}

/**
 * Parse version from pyproject.toml. Looks for [project] version = "x.y.z" or version in dynamic.
 * @param {string} content
 * @returns {string|null}
 */
function parsePyprojectVersion(content) {
  if (!content || typeof content !== 'string') return null;
  const match = content.match(/^version\s*=\s*["']([^"']+)["']\s*$/m);
  return match ? match[1].trim() : null;
}

/**
 * Parse version from setup.py. Looks for version="x.y.z" in setuptools.setup(...).
 * @param {string} content
 * @returns {string|null}
 */
function parseSetupPyVersion(content) {
  if (!content || typeof content !== 'string') return null;
  const match = content.match(/version\s*=\s*["']([^"']+)["']/);
  return match ? match[1].trim() : null;
}

/**
 * Get project name and version for a non-npm project (cargo, go, python).
 * @param {string} dirPath
 * @param {{ type: string, manifestPath: string }} detected
 * @param {object} fsImpl - optional fs for testing
 * @returns {{ ok: boolean, name?: string, version?: string, projectType?: string, error?: string }}
 */
function getNonNpmProjectInfo(dirPath, detected, fsImpl) {
  const fsMod = fsImpl || fs;
  const pathMod = path;
  const basename = dirPath ? pathMod.basename(dirPath) : 'project';
  if (!detected) return { ok: false, error: 'Not a supported project', path: dirPath };

  let version = null;
  let name = basename;

  try {
    if (detected.type === 'cargo') {
      const content = fsMod.readFileSync(detected.manifestPath, 'utf8');
      version = parseCargoVersion(content);
      const nameMatch = content.match(/^name\s*=\s*["']([^"']+)["']\s*$/m);
      if (nameMatch) name = nameMatch[1].trim();
    } else if (detected.type === 'go') {
      const content = fsMod.readFileSync(detected.manifestPath, 'utf8');
      const moduleMatch = content.match(/^module\s+(\S+)\s*$/m);
      if (moduleMatch) name = moduleMatch[1].trim().split('/').pop() || name;
    } else if (detected.type === 'python') {
      const content = fsMod.readFileSync(detected.manifestPath, 'utf8');
      if (detected.manifestPath.endsWith('pyproject.toml')) {
        version = parsePyprojectVersion(content);
        const nameMatch = content.match(/^name\s*=\s*["']([^"']+)["']\s*$/m);
        if (nameMatch) name = nameMatch[1].trim();
      } else {
        version = parseSetupPyVersion(content);
        const nameMatch = content.match(/name\s*=\s*["']([^"']+)["']/);
        if (nameMatch) name = nameMatch[1].trim();
      }
    }
  } catch (e) {
    return { ok: false, error: e.message || 'Failed to read manifest', path: dirPath };
  }

  return {
    ok: true,
    name,
    version,
    projectType: detected.type,
  };
}

module.exports = {
  PROJECT_TYPES,
  detectProjectType,
  parseCargoVersion,
  parseGoVersion,
  parsePyprojectVersion,
  parseSetupPyVersion,
  getNonNpmProjectInfo,
};
