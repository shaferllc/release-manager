/**
 * Shared categories for detail tabs / feature flags and Extensions view.
 * Tab ids not listed here default to category "other".
 */

/** Display order of categories. */
export const CATEGORY_ORDER = [
  'development',
  'infrastructure',
  'content',
  'collaboration',
  'integrations',
  'other',
];

/** Human-readable category labels. */
export const CATEGORY_LABELS = {
  development: 'Development',
  infrastructure: 'Infrastructure',
  content: 'Content & docs',
  collaboration: 'Collaboration',
  other: 'Other',
  integrations: 'Integrations',
};

/** Map tab id -> category id. Built-in and known extensions; rest fall back to "other". */
export const TAB_ID_TO_CATEGORY = {
  // Development: code, build, test, deploy
  'pull-requests': 'development',
  composer: 'development',
  tests: 'development',
  coverage: 'development',
  api: 'development',
  dependencies: 'development',
  terminal: 'development',
  runbooks: 'development',
  'changelog-draft': 'development',
  // Infrastructure
  processes: 'infrastructure',
  tunnels: 'infrastructure',
  ftp: 'infrastructure',
  ssh: 'infrastructure',
  // Content & docs
  markdown: 'content',
  notes: 'content',
  wiki: 'content',
  // Collaboration
  email: 'collaboration',
  kanban: 'collaboration',
  // Integrations
  'github-issues': 'integrations',
  'project-tracker': 'integrations',
  // Other
  bookmarks: 'other',
  checklist: 'other',
  env: 'other',
  'agent-crew': 'other',
};

/**
 * @param {string} tabId
 * @returns {string} category id
 */
export function getCategoryForTabId(tabId) {
  return TAB_ID_TO_CATEGORY[tabId] ?? 'other';
}

/**
 * Group entries { id, label } by category. Returns array of { categoryId, label, entries } in CATEGORY_ORDER.
 * @param {{ id: string, label: string }[]} entries
 * @returns {{ categoryId: string, label: string, entries: { id: string, label: string }[] }[]}
 */
export function groupEntriesByCategory(entries) {
  const byCat = {};
  for (const e of entries) {
    const cat = getCategoryForTabId(e.id);
    if (!byCat[cat]) byCat[cat] = [];
    byCat[cat].push(e);
  }
  return CATEGORY_ORDER.filter((cat) => byCat[cat]?.length).map((categoryId) => ({
    categoryId,
    label: CATEGORY_LABELS[categoryId] ?? categoryId,
    entries: byCat[categoryId],
  }));
}

/**
 * Group extension objects (from getDetailTabExtensions()) by category.
 * @param {Array<{ id: string, label: string, [key: string]: any }>} extensionList
 * @returns {{ categoryId: string, label: string, extensions: typeof extensionList }[]}
 */
export function groupExtensionsByCategory(extensionList) {
  const byCat = {};
  for (const ext of extensionList) {
    const cat = getCategoryForTabId(ext.id);
    if (!byCat[cat]) byCat[cat] = [];
    byCat[cat].push(ext);
  }
  return CATEGORY_ORDER.filter((cat) => byCat[cat]?.length).map((categoryId) => ({
    categoryId,
    label: CATEGORY_LABELS[categoryId] ?? categoryId,
    extensions: byCat[categoryId],
  }));
}
