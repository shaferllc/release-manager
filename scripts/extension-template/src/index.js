/**
 * Shipwell extension entry point.
 *
 * This file is compiled by Vite into a single IIFE bundle (dist/index.js)
 * that the desktop app loads at runtime via eval().
 *
 * Available globals:
 *   window.__registerDetailTabExtension(def)  - Register a detail tab
 *   window.__registerSettingsSection(def)     - Register a settings section
 *   window.__registerCommand(def)             - Register a command palette command
 *   window.__unregisterCommand(id)            - Unregister a command
 *   window.__registerDocSection(def)          - Register a docs section
 *   window.__sendTelemetry(event, properties) - Fire a usage/telemetry event
 *   window.releaseManager                     - IPC API (preferences, git, etc.)
 *   window.Vue                                - Vue runtime (h, ref, reactive, etc.)
 *   window.PrimeVue                           - PrimeVue components (button, panel, dialog, inputtext, etc.)
 */
import ExtensionPanel from './ExtensionPanel.vue';

const ICON = `<svg class="detail-tab-icon-svg" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`;

if (typeof window.__registerDetailTabExtension === 'function') {
  window.__registerDetailTabExtension({
    id: '__EXT_ID__',
    label: '__EXT_NAME__',
    description: '__EXT_DESCRIPTION__',
    version: '1.0.0',
    icon: ICON,
    component: ExtensionPanel,
  });

  // Fire a telemetry event when the extension loads
  if (typeof window.__sendTelemetry === 'function') {
    window.__sendTelemetry('extension.tab_loaded', { extension_id: '__EXT_ID__' });
  }
}
