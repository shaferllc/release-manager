import { ref, onMounted } from 'vue';
import { useApi } from './useApi';

const TAB_ORDER_PREF = 'state.detailTabOrder';

/**
 * Composable for detail tab order: persisted order of tab ids so users can
 * drag-and-drop to reorder. When null/empty, natural order is used.
 * @returns { { detailTabOrder: import('vue').Ref<string[]|null>, setDetailTabOrder: (ids: string[]) => Promise<void>, loadOrder: () => Promise<void> } }
 */
export function useDetailTabOrder() {
  const api = useApi();
  const detailTabOrder = ref(null);

  async function loadOrder() {
    if (!api.getPreference) return;
    try {
      const raw = await api.getPreference(TAB_ORDER_PREF);
      detailTabOrder.value = Array.isArray(raw) ? raw : null;
    } catch {
      detailTabOrder.value = null;
    }
  }

  async function setDetailTabOrder(ids) {
    if (!Array.isArray(ids)) return;
    detailTabOrder.value = ids;
    if (api.setPreference) {
      try {
        await api.setPreference(TAB_ORDER_PREF, ids);
      } catch (_) {}
    }
  }

  onMounted(() => loadOrder());

  return { detailTabOrder, setDetailTabOrder, loadOrder };
}
