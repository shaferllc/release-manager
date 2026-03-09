/**
 * Git panel plugins: each section (Working tree & commit, Branch & sync, etc.) is a plugin
 * with id, label, icon, component, and defaultPosition ('left' | 'center' | 'right').
 * Plugins live under plugins/git/<id>/ with their own component and composables.
 */

import { getGitPanelIcon } from './icons';

// Import each git panel plugin (add new panels by creating plugins/git/<id>/ and adding one line here)
import workingTreePlugin from '../git/working-tree/index.js';
import branchSyncPlugin from '../git/branch-sync/index.js';
import mergeRebasePlugin from '../git/merge-rebase/index.js';
import stashPlugin from '../git/stash/index.js';
import tagsPlugin from '../git/tags/index.js';
import reflogPlugin from '../git/reflog/index.js';
import deleteBranchPlugin from '../git/delete-branch/index.js';
import remotesPlugin from '../git/remotes/index.js';
import compareResetPlugin from '../git/compare-reset/index.js';
import gitignorePlugin from '../git/gitignore/index.js';
import gitattributesPlugin from '../git/gitattributes/index.js';
import submodulesPlugin from '../git/submodules/index.js';
import worktreesPlugin from '../git/worktrees/index.js';
import bisectPlugin from '../git/bisect/index.js';

/** @typedef {'left'|'center'|'right'} GitPanelPosition */

/**
 * @typedef {object} GitPanelPlugin
 * @property {string} id
 * @property {string} label
 * @property {string} [icon] - SVG string
 * @property {import('vue').Component|null} [component] - null for inline (e.g. working-tree)
 * @property {GitPanelPosition} defaultPosition
 */

const PLUGINS = [
  workingTreePlugin,
  branchSyncPlugin,
  mergeRebasePlugin,
  stashPlugin,
  tagsPlugin,
  reflogPlugin,
  deleteBranchPlugin,
  remotesPlugin,
  compareResetPlugin,
  gitignorePlugin,
  gitattributesPlugin,
  submodulesPlugin,
  worktreesPlugin,
  bisectPlugin,
].filter(Boolean).map((p) => ({
  id: p?.id ?? '',
  label: p?.label ?? '',
  defaultPosition: p?.defaultPosition ?? 'center',
  component: p?.component ?? null,
}));

const PREFERENCE_KEY = 'gitPanelPositions';
/** Full panel config (enabled, position, custom label). Replaces position-only preference. */
const CONFIG_PREFERENCE_KEY = 'gitPanelConfig';

/**
 * @returns {GitPanelPlugin[]}
 */
export function getGitPanelPlugins() {
  const list = Array.isArray(PLUGINS) ? PLUGINS : [];
  return list.map((p) => ({
    ...p,
    icon: getGitPanelIcon(p?.id),
  }));
}

/**
 * @param {string} id
 * @returns {GitPanelPlugin|undefined}
 */
export function getGitPanelPlugin(id) {
  return getGitPanelPlugins().find((p) => p.id === id);
}

export const GIT_PANEL_POSITION_PREFERENCE_KEY = PREFERENCE_KEY;
export const GIT_PANEL_CONFIG_PREFERENCE_KEY = CONFIG_PREFERENCE_KEY;

export const POSITION_OPTIONS = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
];
