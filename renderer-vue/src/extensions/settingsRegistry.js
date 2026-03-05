/**
 * Settings extension registry. Extensions register a settings section (id, label, icon, component)
 * that is merged into the Settings nav and rendered when that section is active.
 */

const settingsSections = [];

/**
 * Register a settings section provided by an extension.
 * @param {object} def
 * @param {string} def.id - Unique section id (e.g. 'email')
 * @param {string} def.label - Nav label
 * @param {string} [def.icon] - SVG string for nav icon (same pattern as section icons in useSettings)
 * @param {import('vue').Component} def.component - Vue component for the section content (manages its own state and getPreference/setPreference via useApi)
 */
export function registerSettingsSection(def) {
  if (!def?.id || !def?.label || !def?.component) {
    console.warn('[extensions] registerSettingsSection: id, label, and component are required', def);
    return;
  }
  if (settingsSections.some((s) => s.id === def.id)) {
    console.warn('[extensions] registerSettingsSection: duplicate id', def.id);
    return;
  }
  settingsSections.push({
    id: def.id,
    label: def.label,
    icon: def.icon ?? '',
    component: def.component,
  });
}

/**
 * @returns {Array<{ id: string, label: string, icon: string, component: import('vue').Component }>}
 */
export function getSettingsSections() {
  return [...settingsSections];
}
