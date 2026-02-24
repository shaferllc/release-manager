/**
 * Release strategy: whether to bump+tag or tag-only, and which version to use for the tag.
 * Testable without Electron.
 */

const { formatTag } = require('./version');

const NO_VERSION_ERROR =
  'No version in manifest (e.g. Go). Update version in Cargo.toml / pyproject.toml / setup.py and try again.';

/**
 * Get the release plan for a project type and current version.
 * @param {string} projectType - 'npm' | 'cargo' | 'go' | 'python'
 * @param {string|null} currentVersion - version from manifest (null for Go)
 * @returns {{ action: 'bump_and_tag', versionForTag: null } | { action: 'tag_only', versionForTag: string } | { action: 'error', error: string }}
 */
function getReleasePlan(projectType, currentVersion) {
  if (projectType === 'npm') {
    return { action: 'bump_and_tag', versionForTag: null };
  }
  if (currentVersion == null || String(currentVersion).trim() === '') {
    return { action: 'error', error: NO_VERSION_ERROR };
  }
  const tag = formatTag(currentVersion);
  if (!tag) {
    return { action: 'error', error: 'Invalid version' };
  }
  return { action: 'tag_only', versionForTag: currentVersion };
}

module.exports = { getReleasePlan, NO_VERSION_ERROR };
