/**
 * Parse package.json content for project info. Testable without Electron.
 */

function parsePackageInfo(content, dirPath, pathImpl) {
  const pathMod = pathImpl || require('path');
  if (!content || typeof content !== 'string') {
    return { ok: false, error: 'No package.json or invalid JSON', path: dirPath };
  }
  let pkg;
  try {
    pkg = JSON.parse(content);
  } catch {
    return { ok: false, error: 'No package.json or invalid JSON', path: dirPath };
  }
  const name = pkg.name || (dirPath ? pathMod.basename(dirPath) : 'project');
  const version = typeof pkg.version === 'string' ? pkg.version : null;
  return { ok: true, name, version };
}

module.exports = { parsePackageInfo };
