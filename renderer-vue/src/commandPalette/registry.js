/**
 * Command palette registry. Commands can be registered by the app (built-in)
 * or by extensions via window.__registerCommand. Each command has an id,
 * label, optional category/shortcut, and a run() function.
 */

import { ref, computed } from 'vue';

const commands = ref([]);

/**
 * Register a command for the command palette.
 * @param {object} def
 * @param {string} def.id - Unique command id (e.g. 'app.go-to-dashboard' or 'my-ext.do-thing')
 * @param {string} def.label - Display label (e.g. 'Go to Dashboard')
 * @param {string} [def.category] - Optional category for grouping (e.g. 'Navigation', 'Project')
 * @param {string} [def.shortcut] - Optional shortcut hint for display (e.g. '⌘⇧P')
 * @param {string} [def.description] - Optional longer description (shown as secondary text)
 * @param {string} [def.icon] - Optional icon class (e.g. 'pi pi-home' for PrimeIcons)
 * @param {() => void | Promise<void>} def.run - Called when the user selects the command
 */
export function registerCommand(def) {
  if (!def?.id || !def?.label || typeof def?.run !== 'function') {
    console.warn('[commandPalette] registerCommand: id, label, and run are required', def);
    return;
  }
  if (commands.value.some((c) => c.id === def.id)) {
    console.warn('[commandPalette] registerCommand: duplicate id', def.id);
    return;
  }
  commands.value.push({
    id: def.id,
    label: def.label,
    category: def.category ?? '',
    shortcut: def.shortcut ?? '',
    description: def.description ?? '',
    icon: def.icon ?? '',
    run: def.run,
  });
}

/**
 * Unregister a command by id (e.g. when an extension is disabled).
 * @param {string} id
 */
export function unregisterCommand(id) {
  commands.value = commands.value.filter((c) => c.id !== id);
}

/**
 * @returns {Array<{ id: string, label: string, category: string, shortcut: string, run: function }>}
 */
export function getCommands() {
  return [...commands.value];
}

/**
 * Reactive list of all registered commands (for use in Vue).
 */
export function useCommands() {
  return computed(() => [...commands.value]);
}
