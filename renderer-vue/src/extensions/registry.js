/**
 * Detail-tab extension registry. Extensions register a tab (id, label, icon, component)
 * and optionally a feature-flag id or visibility predicate. The detail view merges
 * these into the tab bar and renders the extension component when the tab is active.
 */

const extensions = [];

/**
 * Register a detail-tab extension.
 * @param {object} def
 * @param {string} def.id - Unique tab id (e.g. 'kanban')
 * @param {string} def.label - Tab label
 * @param {string} [def.description] - Optional short description for the extensions manager UI
 * @param {string} [def.version] - Optional version string (e.g. '1.0.0')
 * @param {string} [def.icon] - Optional SVG string for tab icon (same pattern as TAB_ICONS in useDetailView)
 * @param {import('vue').Component} def.component - Vue component for the panel (receives info prop)
 * @param {string} [def.featureFlagId] - If set, tab visibility is gated by this feature flag
 * @param {(info: object) => boolean} [def.isVisible] - Optional; if provided, tab is shown only when this returns true for current project info
 */
export function registerDetailTabExtension(def) {
  if (!def?.id || !def?.label || !def?.component) {
    console.warn('[extensions] registerDetailTabExtension: id, label, and component are required', def);
    return;
  }
  if (extensions.some((e) => e.id === def.id)) {
    console.warn('[extensions] registerDetailTabExtension: duplicate id', def.id);
    return;
  }
  extensions.push({
    id: def.id,
    label: def.label,
    description: def.description ?? '',
    version: def.version ?? '',
    icon: def.icon ?? '',
    component: def.component,
    featureFlagId: def.featureFlagId ?? null,
    isVisible: typeof def.isVisible === 'function' ? def.isVisible : null,
  });
}

/**
 * @returns {Array<{ id: string, label: string, description: string, version: string, icon: string, component: import('vue').Component, featureFlagId: string|null, isVisible: ((info: object) => boolean)|null }>}
 */
export function getDetailTabExtensions() {
  return [...extensions];
}

/**
 * Get the extension definition for a tab id, if any.
 * @param {string} tabId
 * @returns {object|null}
 */
export function getDetailTabExtension(tabId) {
  return extensions.find((e) => e.id === tabId) ?? null;
}
