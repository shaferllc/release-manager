/**
 * Resolve project name, version, and type from a directory (npm or Cargo/go/python).
 * Testable without Electron.
 */

const path = require('path');
const fs = require('fs');
const { parsePackageInfo } = require('./packageJson');
const { detectProjectType, getNonNpmProjectInfo } = require('./packageManagers');

const DEFAULT_ERROR = 'Not a supported project (package.json, Cargo.toml, go.mod, pyproject.toml, or composer.json)';

/**
 * Get project name, version, and projectType from dirPath. Tries package.json first, then non-npm manifests.
 * @param {string} dirPath
 * @param {object} [pathImpl] - optional path module for testing
 * @param {object} [fsImpl] - optional fs for testing
 * @param {function} [getNonNpmProjectInfoImpl] - optional getNonNpmProjectInfo for testing
 * @returns {{ ok: true, name: string, version: string|null, projectType: string } | { ok: false, error: string, path: string }}
 */
function getProjectNameVersionAndType(dirPath, pathImpl, fsImpl, getNonNpmProjectInfoImpl) {
  const pathMod = pathImpl || path;
  const fsMod = fsImpl || fs;
  const getNonNpm = getNonNpmProjectInfoImpl || getNonNpmProjectInfo;
  const pkgPath = pathMod.join(dirPath, 'package.json');

  try {
    const content = fsMod.readFileSync(pkgPath, 'utf8');
    const parsed = parsePackageInfo(content, dirPath, pathMod);
    if (parsed.ok) {
      return {
        ok: true,
        name: parsed.name,
        version: parsed.version,
        projectType: 'npm',
      };
    }
  } catch (_) {}

  const detected = detectProjectType(dirPath, fsMod);
  const nonNpm = getNonNpm(dirPath, detected, fsMod);
  if (!nonNpm.ok) {
    return {
      ok: false,
      error: nonNpm.error || DEFAULT_ERROR,
      path: dirPath,
    };
  }
  return {
    ok: true,
    name: nonNpm.name,
    version: nonNpm.version,
    projectType: nonNpm.projectType || 'npm',
  };
}

module.exports = { getProjectNameVersionAndType, DEFAULT_ERROR };
