import { ref, computed } from 'vue';
import { getGitPanelPlugins } from '../plugins/gitPanels/registry';
import {
  GIT_PANEL_CONFIG_PREFERENCE_KEY,
  GIT_PANEL_POSITION_PREFERENCE_KEY,
} from '../plugins/gitPanels/registry';

/**
 * Per-panel config stored in preference.
 * @typedef {{ enabled?: boolean, position?: 'left'|'center'|'right', label?: string }} PanelConfigEntry
 */

/**
 * Composable for git panel config: enable/disable, position, and custom name per panel.
 * Loads preference asynchronously; defaults from plugin until loaded.
 * Only enabled panels appear in pluginsByPosition / sectionOptionsForZone.
 * @param {{ getPreference: (key: string) => Promise<unknown>, setPreference: (key: string, value: unknown) => void|Promise<void> }} api
 * @returns {{ load, getPosition, setPosition, isEnabled, setEnabled, getLabel, setLabel, resetPanel, pluginsByPosition, sectionOptionsForZone, allPlugins }}
 */
export function useGitPanelPositions(api) {
  const raw = getGitPanelPlugins();
  const plugins = Array.isArray(raw) ? raw : [];
  /** @type {import('vue').Ref<Record<string, PanelConfigEntry>>} */
  const rawConfig = ref({});

  async function load() {
    try {
      let stored = await api?.getPreference?.(GIT_PANEL_CONFIG_PREFERENCE_KEY);
      if (typeof stored === 'object' && stored !== null) {
        rawConfig.value = { ...stored };
        return;
      }
      // Migrate from old position-only preference
      const legacy = await api?.getPreference?.(GIT_PANEL_POSITION_PREFERENCE_KEY);
      if (typeof legacy === 'object' && legacy !== null) {
        const migrated = {};
        for (const [id, position] of Object.entries(legacy)) {
          if (position === 'left' || position === 'center' || position === 'right') {
            migrated[id] = { enabled: true, position };
          }
        }
        rawConfig.value = migrated;
        if (api?.setPreference) await api.setPreference(GIT_PANEL_CONFIG_PREFERENCE_KEY, migrated);
      } else {
        rawConfig.value = {};
      }
    } catch {
      rawConfig.value = {};
    }
  }

  function getEntry(id) {
    return rawConfig.value[id] ?? {};
  }

  /**
   * @param {string} id
   * @returns {'left'|'center'|'right'}
   */
  function getPosition(id) {
    const p = plugins.find((pl) => pl.id === id);
    const pos = getEntry(id).position;
    if (pos === 'left' || pos === 'center' || pos === 'right') return pos;
    return p?.defaultPosition ?? 'center';
  }

  async function setPosition(id, position) {
    const next = {
      ...rawConfig.value,
      [id]: { ...getEntry(id), position },
    };
    rawConfig.value = next;
    if (api?.setPreference) await api.setPreference(GIT_PANEL_CONFIG_PREFERENCE_KEY, next);
  }

  /** @param {string} id */ function isEnabled(id) {
    const e = getEntry(id);
    if (typeof e.enabled === 'boolean') return e.enabled;
    return true;
  }

  async function setEnabled(id, enabled) {
    const next = {
      ...rawConfig.value,
      [id]: { ...getEntry(id), enabled },
    };
    rawConfig.value = next;
    if (api?.setPreference) await api.setPreference(GIT_PANEL_CONFIG_PREFERENCE_KEY, next);
  }

  /** Effective display label (custom or plugin default). */
  function getLabel(id) {
    const p = plugins.find((pl) => pl.id === id);
    const custom = getEntry(id).label;
    if (typeof custom === 'string' && custom.trim() !== '') return custom.trim();
    return p?.label ?? id;
  }

  async function setLabel(id, label) {
    const trimmed = typeof label === 'string' ? label.trim() : '';
    const next = {
      ...rawConfig.value,
      [id]: {
        ...getEntry(id),
        label: trimmed === '' ? undefined : trimmed,
      },
    };
    rawConfig.value = next;
    if (api?.setPreference) await api.setPreference(GIT_PANEL_CONFIG_PREFERENCE_KEY, next);
  }

  /** Reset one panel to defaults (enabled, default position, default name). */
  async function resetPanel(id) {
    const next = { ...rawConfig.value };
    delete next[id];
    rawConfig.value = next;
    if (api?.setPreference) await api.setPreference(GIT_PANEL_CONFIG_PREFERENCE_KEY, next);
  }

  const pluginsByPosition = computed(() => {
    const left = [];
    const center = [];
    const right = [];
    for (const p of plugins) {
      if (!isEnabled(p.id)) continue;
      const pos = getPosition(p.id);
      const entry = {
        ...p,
        position: pos,
        label: getLabel(p.id),
      };
      if (pos === 'left') left.push(entry);
      else if (pos === 'right') right.push(entry);
      else center.push(entry);
    }
    return { left, center, right };
  });

  /**
   * Section options for the dropdown in a given zone (value, label, icon). Only enabled panels.
   * @param {'left'|'center'|'right'} zone
   */
  function sectionOptionsForZone(zone) {
    const list = pluginsByPosition.value[zone];
    const arr = Array.isArray(list) ? list : [];
    return arr.map((p) => ({ value: p.id, label: p.label, icon: p.icon || '' }));
  }

  /** All plugins with effective config for the config dialog (enabled, position, displayLabel). */
  const allPluginsWithConfig = computed(() =>
    plugins.map((p) => ({
      ...p,
      enabled: isEnabled(p.id),
      position: getPosition(p.id),
      displayLabel: getLabel(p.id),
    }))
  );

  return {
    load,
    getPosition,
    setPosition,
    isEnabled,
    setEnabled,
    getLabel,
    setLabel,
    resetPanel,
    pluginsByPosition,
    sectionOptionsForZone,
    allPlugins: plugins,
    allPluginsWithConfig,
  };
}
