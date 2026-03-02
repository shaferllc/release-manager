import { useAppStore } from '../stores/app';

const DEFAULT_DELAY_MS = 2500;

/**
 * Wraps a long-running action: if it takes longer than delayMs, shows a full-screen loading overlay.
 * Use for release, sync, refresh, run tests, etc.
 * @param {Promise} promise - The async operation (e.g. api.release(...), loadProjects())
 * @param {number} [delayMs] - Show overlay after this many ms (default 2500)
 * @returns {Promise} - The same promise (resolve/reject unchanged)
 */
export function useLongActionOverlay() {
  const store = useAppStore();
  let pendingCount = 0;
  const timerIds = new Set();

  function runWithOverlay(promise, delayMs = DEFAULT_DELAY_MS) {
    if (!promise || typeof promise.then !== 'function') return promise;

    pendingCount += 1;
    store.loadingBarVisible = true;

    const timerId = setTimeout(() => {
      store.loadingOverlayVisible = true;
    }, delayMs);
    timerIds.add(timerId);

    function done() {
      clearTimeout(timerId);
      timerIds.delete(timerId);
      pendingCount -= 1;
      if (pendingCount <= 0) {
        pendingCount = 0;
        store.loadingOverlayVisible = false;
        store.loadingBarVisible = false;
      }
    }

    return promise.finally(done);
  }

  return { runWithOverlay };
}
