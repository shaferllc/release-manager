/**
 * Version/tag helpers. Testable without Electron.
 */

const BUMP_VALUES = ['patch', 'minor', 'major'];
const PRERELEASE_PREID = 'beta';

function isValidBump(bump) {
  return BUMP_VALUES.includes(bump);
}

function isPrereleaseBump(bump) {
  return bump === 'prerelease';
}

function formatTag(version) {
  if (!version || typeof version !== 'string') return null;
  return version.startsWith('v') ? version : `v${version}`;
}

module.exports = { BUMP_VALUES, PRERELEASE_PREID, isValidBump, isPrereleaseBump, formatTag };
