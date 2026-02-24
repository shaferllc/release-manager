/**
 * Documentation structure: section titles and feature keys that must appear in the in-app doc.
 * Used by tests to ensure the docs view stays in sync.
 */

/** Section titles that must appear as <h3> in the Documentation tab content (in order). */
const DOC_SECTION_TITLES = [
  'Overview',
  'Adding projects',
  'Project detail',
  'Dashboard',
  'Batch release',
  'Settings',
  'Generate with Ollama',
  'Package managers',
  'Theme',
];

/** Feature/term strings that should appear in the doc content (subset; used for smoke check). */
const DOC_FEATURE_KEYS = [
  'npm',
  'Rust',
  'Go',
  'Python',
  'package.json',
  'Cargo.toml',
  'go.mod',
  'pyproject.toml',
  'Git',
  'Tag and push',
  'Sync',
  'GitHub token',
  'Open in Terminal',
  'Open in editor',
  'Documentation',
  'Keyboard shortcuts',
  'suggested bump',
  'ollama serve',
  'ollama pull',
];

/**
 * Return whether the given HTML string contains all required doc section titles.
 * @param {string} html
 * @returns {{ ok: boolean, missing: string[] }}
 */
function docHasRequiredSections(html) {
  if (!html || typeof html !== 'string') {
    return { ok: false, missing: [...DOC_SECTION_TITLES] };
  }
  const missing = DOC_SECTION_TITLES.filter((title) => !html.includes(title));
  return { ok: missing.length === 0, missing };
}

/**
 * Return whether the given HTML string contains the docs view and required feature keys.
 * @param {string} html
 * @returns {{ ok: boolean, missing: string[] }}
 */
function docHasRequiredFeatures(html) {
  if (!html || typeof html !== 'string') {
    return { ok: false, missing: [...DOC_FEATURE_KEYS] };
  }
  const hasView = html.includes('id="docs-view"') && html.includes('docs-content');
  const missing = DOC_FEATURE_KEYS.filter((key) => !html.includes(key));
  if (!hasView) missing.push('docs-view');
  return { ok: hasView && missing.length === 0, missing };
}

module.exports = {
  DOC_SECTION_TITLES,
  DOC_FEATURE_KEYS,
  docHasRequiredSections,
  docHasRequiredFeatures,
};
