/**
 * Composable for the command palette: open/close state and run command.
 * Built-in commands are registered by the app (e.g. in App.vue onMounted) via registerBuiltinCommands().
 */

import { ref } from 'vue';
import { getCommands } from './registry';

const PREF_RECENT = 'commandPalette.recentIds';
const isOpen = ref(false);
const RECENT_MAX = 5;
const recentIds = ref([]);

export function useCommandPalette() {
  function open() {
    isOpen.value = true;
    const api = typeof window !== 'undefined' && window.releaseManager;
    api?.sendTelemetry?.('command_palette.opened', {});
  }

  function close() {
    isOpen.value = false;
  }

  function toggle() {
    isOpen.value = !isOpen.value;
  }

  /**
   * Load recent command ids from preferences (persisted across sessions).
   */
  function loadRecents() {
    const api = typeof window !== 'undefined' && window.releaseManager;
    if (!api?.getPreference) return Promise.resolve();
    return api.getPreference(PREF_RECENT).then((ids) => {
      if (Array.isArray(ids) && ids.length) {
        recentIds.value = ids.slice(0, RECENT_MAX);
      }
    }).catch(() => {});
  }

  function saveRecents() {
    const api = typeof window !== 'undefined' && window.releaseManager;
    if (api?.setPreference) api.setPreference(PREF_RECENT, recentIds.value);
  }

  /**
   * Run a command by id and close the palette. Records the command in recent list and persists it.
   * @param {string} id
   */
  function runCommand(id) {
    const commands = getCommands();
    const cmd = commands.find((c) => c.id === id);
    if (cmd) {
      const api = typeof window !== 'undefined' && window.releaseManager;
      api?.sendTelemetry?.('command_palette.run', { command: id });
      recentIds.value = [id, ...recentIds.value.filter((x) => x !== id)].slice(0, RECENT_MAX);
      saveRecents();
      close();
      try {
        const result = cmd.run();
        if (result && typeof result.then === 'function') {
          result.catch((err) => console.error('[commandPalette] command failed:', id, err));
        }
      } catch (err) {
        console.error('[commandPalette] command failed:', id, err);
      }
    }
  }

  return {
    isOpen,
    recentIds,
    open,
    close,
    toggle,
    runCommand,
    loadRecents,
  };
}
