import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useApi } from './useApi';
import { useAppStore } from '../stores/app';

const DEFAULT_MIN = 160;
const DEFAULT_MAX = 480;

/**
 * Composable for a resizable sidebar that persists width via preferences.
 * @param {Object} options
 * @param {string} options.preferenceKey - Key for getPreference/setPreference (e.g. 'mainSidebarWidth')
 * @param {number} options.defaultWidth - Default width in px when no preference is set
 * @param {number} [options.minWidth] - Minimum width in px
 * @param {number} [options.maxWidth] - Maximum width in px
 * @param {boolean} [options.rightSide] - If true, handle is on the left of the panel (right sidebar); drag right = narrower
 * @param {boolean} [options.useStoreLock] - If true, respect store.sidebarWidthLocked (main sidebar only)
 * @param {Object} [options.store] - App store (for tests); when useStoreLock and not provided, uses useAppStore()
 * @returns {{ sidebarWidth: import('vue').Ref<number>, sidebarStyle: import('vue').ComputedRef<{ width: string }>, onResizerPointerDown: (e: PointerEvent) => void }}
 */
export function useResizableSidebar({
  preferenceKey,
  defaultWidth,
  minWidth = DEFAULT_MIN,
  maxWidth = DEFAULT_MAX,
  rightSide = false,
  useStoreLock = false,
  store: storeOption = null,
}) {
  const api = useApi();
  const store = storeOption ?? (useStoreLock ? useAppStore() : null);
  const sidebarWidth = ref(defaultWidth);
  const resizeListenersRef = ref(null);

  const sidebarStyle = computed(() => ({
    width: `${sidebarWidth.value}px`,
    minWidth: `${minWidth}px`,
    maxWidth: `${maxWidth}px`,
  }));

  function clamp(w) {
    return Math.min(maxWidth, Math.max(minWidth, w));
  }

  function saveWidth() {
    const w = sidebarWidth.value;
    if (typeof api.setPreference === 'function' && preferenceKey) {
      api.setPreference(preferenceKey, w);
    }
  }

  function onResizerPointerDown(e) {
    if (e.button !== 0) return;
    if (useStoreLock && store?.sidebarWidthLocked) return;
    e.preventDefault();
    const startX = e.clientX;
    const startW = sidebarWidth.value;
    const move = (ev) => {
      const delta = ev.clientX - startX;
      sidebarWidth.value = clamp(rightSide ? startW - delta : startW + delta);
    };
    const up = () => {
      saveWidth();
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      resizeListenersRef.value = null;
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    resizeListenersRef.value = { move, up };
  }

  onUnmounted(() => {
    const listeners = resizeListenersRef.value;
    if (listeners) {
      document.removeEventListener('pointermove', listeners.move);
      document.removeEventListener('pointerup', listeners.up);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      resizeListenersRef.value = null;
    }
  });

  onMounted(async () => {
    if (typeof api.getPreference !== 'function' || !preferenceKey) return;
    try {
      const saved = await api.getPreference(preferenceKey);
      if (typeof saved === 'number' && saved > 0) {
        sidebarWidth.value = clamp(saved);
      }
    } catch (_) {}
  });

  return { sidebarWidth, sidebarStyle, onResizerPointerDown };
}
