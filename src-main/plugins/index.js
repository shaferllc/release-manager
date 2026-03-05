/**
 * Plugin registry. Plugins are feature modules (e.g. git) that can be enabled/disabled.
 * Each plugin exports: id, isEnabled(store), createApi(deps?), createStub?.
 */

const gitPlugin = require('./git');

function getPlugins() {
  return [gitPlugin];
}

function getGitPlugin() {
  return getPlugins().find((p) => p.id === 'git') || null;
}

module.exports = { getPlugins, getGitPlugin };
