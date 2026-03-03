import { ref, computed, onMounted } from 'vue';
import { useApi } from './useApi';

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
 * @returns {{ sidebarWidth: import('vue').Ref<number>, sidebarStyle: import('vue').ComputedRef<{ width: string }>, onResizerPointerDown: (e: PointerEvent) => void }}
 */
export function useResizableSidebar({
  preferenceKey,
  defaultWidth,
  minWidth = DEFAULT_MIN,
  maxWidth = DEFAULT_MAX,
  rightSide = false,
}) {
  const api = useApi();
  const sidebarWidth = ref(defaultWidth);

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
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  }

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
