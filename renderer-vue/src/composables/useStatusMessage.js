import { ref } from 'vue';

/**
 * Composable for a transient status message that auto-clears after a delay.
 * Use for copy/export feedback (e.g. "Copied!", "Failed", "Exported!").
 * @param {number} resetMs - Delay before clearing the message (default 2500)
 * @returns {{ status: Ref<string>, clear: () => void, setSuccess: () => void, setError: () => void, setExported: () => void }}
 */
export function useStatusMessage(resetMs = 2500) {
  const status = ref('');
  let timer = null;

  function scheduleClear() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      status.value = '';
      timer = null;
    }, resetMs);
  }

  function clear() {
    status.value = '';
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function setSuccess() {
    status.value = 'Copied!';
    scheduleClear();
  }

  function setError() {
    status.value = 'Failed';
    scheduleClear();
  }

  function setExported() {
    status.value = 'Exported!';
    scheduleClear();
  }

  return { status, clear, setSuccess, setError, setExported };
}
