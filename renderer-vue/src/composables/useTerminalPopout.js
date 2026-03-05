import { ref, computed, onMounted } from 'vue';
import { truncatePath } from '../utils';

/**
 * Composable for terminal popout window: dir path from main process, display path, close.
 * No arguments. Returns { dirPath, displayPath, closeWindow }.
 */
export function useTerminalPopout() {
  const dirPath = ref('');

  const displayPath = computed(() => truncatePath(dirPath.value || '', 49));

  function closeWindow() {
    if (window.releaseManager?.closeTerminalPopoutWindow) {
      window.releaseManager.closeTerminalPopoutWindow();
    }
  }

  async function load() {
    if (window.releaseManager?.getTerminalPopoutState) {
      try {
        const state = await window.releaseManager.getTerminalPopoutState();
        dirPath.value = state?.dirPath ?? '';
      } catch {
        dirPath.value = '';
      }
    }
  }

  onMounted(() => load());

  return { dirPath, displayPath, closeWindow };
}
