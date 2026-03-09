/**
 * Git sidebar widget and reflog constants.
 * Used by useGitSidebar and DetailGitSection.
 */
export const GIT_SIDEBAR_WIDGET_IDS = ['local-branches', 'remote', 'worktrees', 'tags', 'stash', 'submodules', 'reflog'];

export const GIT_SIDEBAR_WIDGET_LABELS = {
  'local-branches': 'Local branches',
  'remote': 'Remote',
  'worktrees': 'Worktrees',
  'tags': 'Tags',
  'stash': 'Stash',
  'submodules': 'Submodules',
  'reflog': 'Reflog',
};

export const GIT_SIDEBAR_WIDGET_ORDER_KEY = 'gitSidebarWidgetOrder';
export const GIT_SIDEBAR_WIDGET_VISIBLE_KEY = 'gitSidebarWidgetVisibility';

export const REFLOG_CATEGORY_ORDER = ['commit', 'checkout', 'merge', 'rebase', 'reset', 'other'];

export function reflogCategoryFromMessage(message) {
  const m = String(message || '').toLowerCase();
  if (m.startsWith('commit')) return 'commit';
  if (m.startsWith('checkout')) return 'checkout';
  if (m.startsWith('merge')) return 'merge';
  if (m.startsWith('rebase')) return 'rebase';
  if (m.startsWith('reset')) return 'reset';
  return 'other';
}

export function reflogCategoryLabel(key) {
  const labels = { commit: 'Commit', checkout: 'Checkout', merge: 'Merge', rebase: 'Rebase', reset: 'Reset', other: 'Other' };
  return labels[key] || key;
}
