import { ref, watch, onMounted, computed } from 'vue';
import { useAppStore } from '../stores/app';
import { useApi } from './useApi';
import { useLicense } from './useLicense';
import { useExtensionPrefs } from './useExtensionPrefs';
import { useDetailTabOrder } from './useDetailTabOrder';
import { getDetailTabExtensions } from '../extensions/registry';

const TAB_ICONS = {
  dashboard: '<svg class="detail-tab-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>',
  git: '<svg class="detail-tab-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="6" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M6 15a3 3 0 0 0 6 0"/></svg>',
  version: '<svg class="detail-tab-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4"/><path d="m4.9 4.9 2.8 2.8"/><path d="M2 12h4"/><path d="m4.9 19.1 2.8-2.8"/><path d="M12 18v4"/><path d="m19.1 19.1-2.8-2.8"/><path d="M22 12h-4"/><path d="m19.1 4.9-2.8 2.8"/><circle cx="12" cy="12" r="4"/></svg>',
  composer: '<svg class="detail-tab-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  tests: '<svg class="detail-tab-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2 1.33-2 0 0-2.77 2.24-5 5-5 1.66 0 3 1.35 3 3.02 0 1.33 2 1.33 2 0"/></svg>',
  coverage: '<svg class="detail-tab-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>',
  api: '<svg class="detail-tab-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d=\"M4 4h7v7H4z\"/><path d=\"M13 4h7v7h-7z\"/><path d=\"M4 13h7v7H4z\"/><path d=\"M13 13h7v7h-7z\"/></svg>',
  pullRequests: '<svg class="detail-tab-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h5a2 2 0 0 1 2 2v7"/><path d="M6 9v6a2 2 0 0 0 2 2h7"/></svg>',
};

const BASE_TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: TAB_ICONS.dashboard },
  { id: 'git', label: 'Git', icon: TAB_ICONS.git },
  { id: 'version', label: 'Version & release', icon: TAB_ICONS.version },
  { id: 'pull-requests', label: 'Pull requests', icon: TAB_ICONS.pullRequests },
];

/**
 * Composable for detail view: project info, tabs, load on path change.
 * No arguments. Returns { store, info, error, visibleTabs, load }.
 */
export function useDetailView() {
  const store = useAppStore();
  const api = useApi();
  const license = useLicense();
  const extPrefs = useExtensionPrefs();
  const { detailTabOrder, setDetailTabOrder } = useDetailTabOrder();

  const info = ref(null);
  const error = ref(null);

  const projectType = computed(() => (info.value?.projectType || '').toLowerCase());
  const showTestsTab = computed(() => projectType.value === 'npm' || projectType.value === 'php');
  const showCoverageTab = computed(() => projectType.value === 'npm' || projectType.value === 'php');

  const visibleTabs = computed(() => {
    const allowed = (id) => license.isTabAllowed(id);
    const t = BASE_TABS.filter((tab) => tab && tab.id && allowed(tab.id));
    if (allowed('composer') && info.value?.hasComposer) t.push({ id: 'composer', label: 'Composer', icon: TAB_ICONS.composer });
    if (allowed('tests') && showTestsTab.value) t.push({ id: 'tests', label: 'Tests', icon: TAB_ICONS.tests });
    if (allowed('coverage') && showCoverageTab.value) t.push({ id: 'coverage', label: 'Coverage', icon: TAB_ICONS.coverage });
    if (allowed('api')) t.push({ id: 'api', label: 'API', icon: TAB_ICONS.api });
    const extensions = getDetailTabExtensions();
    extensions.forEach((ext) => {
      if (!ext || ext.id == null) return;
      if (!extPrefs.isEnabled(ext.id)) return;
      if (ext.isVisible && info.value && !ext.isVisible(info.value)) return;
      t.push({ id: ext.id, label: ext.label, icon: ext.icon });
    });
    const order = detailTabOrder.value;
    if (Array.isArray(order) && order.length > 0) {
      t.sort((a, b) => {
        const i = order.indexOf(a.id);
        const j = order.indexOf(b.id);
        if (i === -1 && j === -1) return 0;
        if (i === -1) return 1;
        if (j === -1) return -1;
        return i - j;
      });
    }
    return t.filter((tab) => tab && tab.id != null);
  });

  watch(visibleTabs, (tabs) => {
    const ids = tabs.map((t) => t.id);
    if (ids.length && !ids.includes(store.detailTab)) store.setDetailTab('dashboard');
  }, { immediate: true });

  async function load() {
    const path = store.selectedPath;
    if (!path) {
      info.value = null;
      error.value = null;
      store.setCurrentInfo(null);
      return;
    }
    info.value = null;
    error.value = null;
    store.setCurrentInfo(null);
    try {
      const result = await api.getProjectInfo?.(path);
      if (store.selectedPath !== path) return;
      if (!result?.ok) {
        error.value = result?.error || 'Failed to load project info';
        info.value = null;
        return;
      }
      info.value = result;
      store.setCurrentInfo(result);
    } catch (e) {
      if (store.selectedPath !== path) return;
      error.value = e?.message || 'Failed to load project info';
      info.value = null;
    }
  }

  onMounted(() => load());
  watch(() => store.selectedPath, () => load());

  return { store, info, error, visibleTabs, load, setDetailTabOrder };
}
