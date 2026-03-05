/**
 * Git plugin: provides the Git API when enabled; can be disabled for testing or to run without git.
 * Not an "extension" (no UI tab) — just a toggleable plugin for git functionality.
 *
 * Enable/disable: set preference `plugins.git.enabled` to false to disable (default: true).
 * Tests: each git function lives in lib/git/*.js with __tests__; this plugin is tested in
 * plugins/git/__tests__/ (stub and plugin behaviour).
 */

const { createGitApi } = require('../../lib/git');
const { createGitStub } = require('./stub');

const PLUGIN_ID = 'git';

/**
 * @param {import('electron-store').default} store
 * @returns {boolean}
 */
function isEnabled(store) {
  if (!store || typeof store.get !== 'function') return true;
  return store.get('plugins.git.enabled') !== false;
}

/**
 * @param {object} deps - Same deps as createGitApi (runInDir, path, fs, getPreference, parsers, etc.)
 * @returns {ReturnType<typeof createGitApi>}
 */
function createApi(deps) {
  return createGitApi(deps);
}

module.exports = {
  id: PLUGIN_ID,
  isEnabled,
  createApi,
  createStub: createGitStub,
  createGitApi, // for tests that need to test the real API directly
};
