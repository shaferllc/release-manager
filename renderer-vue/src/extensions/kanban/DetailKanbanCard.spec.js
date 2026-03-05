import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useAppStore } from '../../stores/app';
import DetailKanbanCard from './DetailKanbanCard.vue';

const defaultColumns = [
  { id: 'todo', label: 'To Do', isBacklog: true },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'done', label: 'Done', isArchive: true },
];

function mockBoardPayload(overrides = {}) {
  return {
    boards: {
      team: {
        name: 'Team',
        columns: defaultColumns,
        cards: [
          {
            id: 'card-1',
            title: 'Test card',
            columnId: 'todo',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        showArchived: false,
        swimlaneBy: 'none',
        agingWarnDays: 5,
        agingUrgentDays: 14,
        inProgressColumnId: '',
        sleTargetPercent: 85,
        sleDays: 5,
        boardHistory: [],
        optInWorkflowAutomation: false,
        optInCycleTimeAnalytics: false,
        optInDependencyTracking: false,
        optInSmartFilteringViews: false,
        optInForecastingPredictive: false,
        savedViews: [],
      },
    },
    activeBoardId: 'team',
    ...overrides,
  };
}

describe('DetailKanbanCard', () => {
  let pinia;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    vi.clearAllMocks();
    const store = useAppStore();
    store.setSelectedPath('/test-project');
  });

  it('renders Kanban title and board UI', async () => {
    window.releaseManager.getPreference = vi.fn().mockResolvedValue(mockBoardPayload());
    const wrapper = mount(DetailKanbanCard, {
      props: { info: {} },
      global: { plugins: [pinia] },
    });
    await flushPromises();
    expect(wrapper.text()).toContain('Kanban');
    expect(wrapper.text()).toContain('Board');
    expect(wrapper.text()).toContain('Add list');
  });

  it('renders default columns when getPreference returns board data', async () => {
    window.releaseManager.getPreference = vi.fn().mockResolvedValue(mockBoardPayload());
    const wrapper = mount(DetailKanbanCard, {
      props: { info: {} },
      global: { plugins: [pinia] },
    });
    await flushPromises();
    expect(wrapper.text()).toContain('To Do');
    expect(wrapper.text()).toContain('In Progress');
    // Done is an archive column and hidden by default; visible columns are To Do and In Progress
  });

  it('renders cards from loaded board data', async () => {
    window.releaseManager.getPreference = vi.fn().mockResolvedValue(mockBoardPayload());
    const wrapper = mount(DetailKanbanCard, {
      props: { info: {} },
      global: { plugins: [pinia] },
    });
    await flushPromises();
    expect(wrapper.text()).toContain('Test card');
  });

  it('calls getPreference with ext.kanban pref key for selected path', async () => {
    const store = useAppStore();
    store.setSelectedPath('/my/project');
    window.releaseManager.getPreference = vi.fn().mockResolvedValue(mockBoardPayload());
    mount(DetailKanbanCard, {
      props: { info: {} },
      global: { plugins: [pinia] },
    });
    await flushPromises();
    expect(window.releaseManager.getPreference).toHaveBeenCalledWith('ext.kanban.%2Fmy%2Fproject');
  });

  it('renders default To Do / In Progress / Done when getPreference returns empty', async () => {
    window.releaseManager.getPreference = vi.fn().mockResolvedValue(null);
    const wrapper = mount(DetailKanbanCard, {
      props: { info: {} },
      global: { plugins: [pinia] },
    });
    await flushPromises();
    expect(wrapper.text()).toContain('To Do');
    expect(wrapper.text()).toContain('In Progress');
    expect(wrapper.text()).toContain('Done');
  });

  it('has data-detail-tab="kanban" on root section', async () => {
    window.releaseManager.getPreference = vi.fn().mockResolvedValue(mockBoardPayload());
    const wrapper = mount(DetailKanbanCard, {
      props: { info: {} },
      global: { plugins: [pinia] },
    });
    await flushPromises();
    const section = wrapper.find('section[data-detail-tab="kanban"]');
    expect(section.exists()).toBe(true);
  });

  it('column drop zones have data-column-id attribute', async () => {
    window.releaseManager.getPreference = vi.fn().mockResolvedValue(mockBoardPayload());
    const wrapper = mount(DetailKanbanCard, {
      props: { info: {} },
      global: { plugins: [pinia] },
    });
    await flushPromises();
    const dropZones = wrapper.findAll('.kanban-column-cards[data-column-id]');
    expect(dropZones.length).toBeGreaterThanOrEqual(1);
    expect(dropZones[0].attributes('data-column-id')).toBeDefined();
  });
});

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
