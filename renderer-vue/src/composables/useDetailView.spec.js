import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useDetailView } from './useDetailView';

const mockStore = {
  selectedPath: null,
  detailTab: 'dashboard',
  setSelectedPath: vi.fn(),
  setDetailTab: vi.fn(),
  setCurrentInfo: vi.fn(),
};

const mockApi = {
  getProjectInfo: vi.fn(),
};

const mockLicense = {
  isTabAllowed: vi.fn((id) => ['dashboard', 'git', 'version', 'pull-requests', 'api'].includes(id)),
};

const mockExtPrefs = {
  isEnabled: vi.fn(() => true),
};

const mockDetailTabOrder = {
  detailTabOrder: { value: null },
  setDetailTabOrder: vi.fn(),
};

vi.mock('../stores/app', () => ({
  useAppStore: () => mockStore,
}));

vi.mock('./useApi', () => ({ useApi: () => mockApi }));
vi.mock('./useLicense', () => ({ useLicense: () => mockLicense }));
vi.mock('./useExtensionPrefs', () => ({ useExtensionPrefs: () => mockExtPrefs }));
vi.mock('./useDetailTabOrder', () => ({ useDetailTabOrder: () => mockDetailTabOrder }));
const mockExtensions = [];
vi.mock('../extensions/registry', () => ({
  getDetailTabExtensions: () => mockExtensions,
}));

describe('useDetailView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockStore.selectedPath = null;
    mockStore.detailTab = 'dashboard';
  });

  it('returns store, info, error, visibleTabs, load, setDetailTabOrder', () => {
    const { store, info, error, visibleTabs, load, setDetailTabOrder } = useDetailView();
    expect(store).toBeDefined();
    expect(info).toBeDefined();
    expect(error).toBeDefined();
    expect(visibleTabs).toBeDefined();
    expect(typeof load).toBe('function');
    expect(typeof setDetailTabOrder).toBe('function');
  });

  it('load clears info when no path', async () => {
    mockStore.selectedPath = null;
    const { load } = useDetailView();
    await load();
    expect(mockStore.setCurrentInfo).toHaveBeenCalledWith(null);
  });

  it('load fetches project info when path set', async () => {
    mockStore.selectedPath = '/my/project';
    mockApi.getProjectInfo.mockResolvedValue({ ok: true, path: '/my/project', name: 'My Project' });
    const { load, info } = useDetailView();
    await load();
    expect(mockApi.getProjectInfo).toHaveBeenCalledWith('/my/project');
    expect(info.value).toEqual({ ok: true, path: '/my/project', name: 'My Project' });
  });

  it('load sets error when result not ok', async () => {
    mockStore.selectedPath = '/my/project';
    mockApi.getProjectInfo.mockResolvedValue({ ok: false, error: 'Not found' });
    const { load, info, error } = useDetailView();
    await load();
    expect(error.value).toBe('Not found');
    expect(info.value).toBeNull();
  });

  it('visibleTabs includes base tabs when allowed', () => {
    const { visibleTabs } = useDetailView();
    const ids = visibleTabs.value.map((t) => t.id);
    expect(ids).toContain('dashboard');
    expect(ids).toContain('git');
    expect(ids).toContain('version');
    expect(ids).toContain('pull-requests');
    expect(ids).toContain('api');
  });

  it('load sets error on catch', async () => {
    mockStore.selectedPath = '/my/project';
    mockApi.getProjectInfo.mockRejectedValue(new Error('Network error'));
    const { load, error } = useDetailView();
    await load();
    expect(error.value).toBe('Network error');
  });

  it('visibleTabs includes extension when allowed and enabled', () => {
    mockLicense.isTabAllowed.mockImplementation((id) =>
      ['dashboard', 'git', 'version', 'pull-requests', 'api', 'my-ext'].includes(id),
    );
    mockExtensions.length = 0;
    mockExtensions.push({
      id: 'my-ext',
      label: 'My Extension',
      icon: '<svg/>',
      component: {},
      isVisible: null,
    });
    const { visibleTabs } = useDetailView();
    expect(visibleTabs.value.some((t) => t.id === 'my-ext')).toBe(true);
  });

  it('visibleTabs excludes extension when isVisible returns false', async () => {
    mockLicense.isTabAllowed.mockImplementation((id) =>
      ['dashboard', 'git', 'version', 'pull-requests', 'api', 'cond-ext'].includes(id),
    );
    mockStore.selectedPath = '/x';
    mockApi.getProjectInfo.mockResolvedValue({ ok: true, path: '/x' });
    mockExtensions.length = 0;
    mockExtensions.push({
      id: 'cond-ext',
      label: 'Conditional',
      icon: '',
      isVisible: () => false,
    });
    const { load, visibleTabs } = useDetailView();
    await load();
    expect(visibleTabs.value.some((t) => t.id === 'cond-ext')).toBe(false);
  });

  it('visibleTabs respects tab order when set', () => {
    mockDetailTabOrder.detailTabOrder.value = ['api', 'dashboard', 'git'];
    const { visibleTabs } = useDetailView();
    const ids = visibleTabs.value.map((t) => t.id);
    const apiIdx = ids.indexOf('api');
    const dashIdx = ids.indexOf('dashboard');
    const gitIdx = ids.indexOf('git');
    expect(apiIdx).toBeLessThan(dashIdx);
    expect(dashIdx).toBeLessThan(gitIdx);
  });
});
