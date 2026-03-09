/**
 * Detail-tab extension registry. Extensions register a tab (id, label, icon, component)
 * and optionally a feature-flag id or visibility predicate. The detail view merges
 * these into the tab bar and renders the extension component when the tab is active.
 *
 * Extensions can also append documentation sections via registerDocSection().
 */

import { ref } from 'vue';

const extensions = ref([]);
const docSections = ref([]);

/**
 * Register a detail-tab extension.
 * @param {object} def
 * @param {string} def.id - Unique tab id (e.g. 'kanban')
 * @param {string} def.label - Tab label
 * @param {string} [def.description] - Optional short description for the extensions manager UI
 * @param {string} [def.version] - Optional version string (e.g. '1.0.0')
 * @param {string} [def.icon] - Optional SVG string for tab icon (same pattern as TAB_ICONS in useDetailView)
 * @param {import('vue').Component} def.component - Vue component for the panel (receives info prop)
 * @param {(info: object) => boolean} [def.isVisible] - Optional; if provided, tab is shown only when this returns true for current project info
 */
export function registerDetailTabExtension(def) {
  if (!def?.id || !def?.label || !def?.component) {
    console.warn('[extensions] registerDetailTabExtension: id, label, and component are required', def);
    return;
  }
  if (extensions.value.some((e) => e.id === def.id)) {
    console.warn('[extensions] registerDetailTabExtension: duplicate id', def.id);
    return;
  }
  extensions.value.push({
    id: def.id,
    label: def.label,
    description: def.description ?? '',
    version: def.version ?? '',
    icon: def.icon ?? '',
    component: def.component,
    isVisible: typeof def.isVisible === 'function' ? def.isVisible : null,
  });
}

/**
 * @returns {Array<{ id: string, label: string, description: string, version: string, icon: string, component: import('vue').Component, isVisible: ((info: object) => boolean)|null }>}
 */
export function getDetailTabExtensions() {
  return [...extensions.value];
}

/**
 * Get the extension definition for a tab id, if any.
 * @param {string} tabId
 * @returns {object|null}
 */
export function getDetailTabExtension(tabId) {
  return extensions.value.find((e) => e.id === tabId) ?? null;
}

/**
 * Register a documentation section that appears in the Docs view.
 * @param {object} def
 * @param {string} def.id - Unique section id (e.g. 'my-ext-docs')
 * @param {string} def.title - Section heading
 * @param {string} [def.category] - Category grouping (e.g. 'Extensions', 'Integrations')
 * @param {number} [def.order] - Sort order within category (lower = first, default 100)
 * @param {Array<{heading: string, body: string}>} def.items - Accordion items with heading and HTML body
 */
export function registerDocSection(def) {
  if (!def?.id || !def?.title || !Array.isArray(def?.items) || !def.items.length) {
    console.warn('[extensions] registerDocSection: id, title, and items[] are required', def);
    return;
  }
  if (docSections.value.some((s) => s.id === def.id)) {
    console.warn('[extensions] registerDocSection: duplicate id', def.id);
    return;
  }
  docSections.value.push({
    id: def.id,
    title: def.title,
    category: def.category ?? 'Extensions',
    order: def.order ?? 100,
    items: def.items,
  });
}

/**
 * @returns {Array<{id: string, title: string, category: string, order: number, items: Array<{heading: string, body: string}>}>}
 */
export function getDocSections() {
  return [...docSections.value].sort((a, b) => a.order - b.order);
}
