import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import DetailReleaseChecklistCard from './DetailReleaseChecklistCard.vue';

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('DetailReleaseChecklistCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    window.releaseManager = {
      getPreference: vi.fn(),
      setPreference: vi.fn(),
    };
  });

  it('renders Release checklist title and Add item button', async () => {
    window.releaseManager.getPreference.mockResolvedValue(null);
    const wrapper = mount(DetailReleaseChecklistCard, {
      props: { info: { path: '/my/project' } },
      global: { plugins: [createPinia()] },
    });
    await flushPromises();
    expect(wrapper.text()).toContain('Checklist');
    expect(wrapper.text()).toContain('Add item');
  });

  it('calls getPreference with projectReleaseChecklist for project path', async () => {
    window.releaseManager.getPreference.mockResolvedValue(null);
    mount(DetailReleaseChecklistCard, {
      props: { info: { path: '/my/project' } },
      global: { plugins: [createPinia()] },
    });
    await flushPromises();
    expect(window.releaseManager.getPreference).toHaveBeenCalledWith('projectReleaseChecklist');
  });

  it('renders empty state when no items', async () => {
    window.releaseManager.getPreference.mockResolvedValue(null);
    const wrapper = mount(DetailReleaseChecklistCard, {
      props: { info: { path: '/p' } },
      global: { plugins: [createPinia()] },
    });
    await flushPromises();
    expect(wrapper.text()).toContain('No checklist items');
    expect(wrapper.text()).toContain('Use default checklist');
  });

  it('renders checklist items when getPreference returns saved items', async () => {
    const path = '/my/project';
    window.releaseManager.getPreference.mockResolvedValue({
      [path]: {
        items: [
          { id: 'i1', label: 'Update CHANGELOG', checked: false },
          { id: 'i2', label: 'Run tests', checked: true },
        ],
      },
    });
    const wrapper = mount(DetailReleaseChecklistCard, {
      props: { info: { path } },
      global: { plugins: [createPinia()] },
    });
    await flushPromises();
    expect(wrapper.text()).toContain('Update CHANGELOG');
    expect(wrapper.text()).toContain('Run tests');
  });

  it('has data-detail-tab="checklist" on root section', async () => {
    window.releaseManager.getPreference.mockResolvedValue(null);
    const wrapper = mount(DetailReleaseChecklistCard, {
      props: { info: { path: '/p' } },
      global: { plugins: [createPinia()] },
    });
    await flushPromises();
    const section = wrapper.find('.detail-release-checklist');
    expect(section.exists()).toBe(true);
    expect(section.attributes('data-detail-tab')).toBe('checklist');
  });

  it('shows Reset all button when there are items', async () => {
    window.releaseManager.getPreference.mockResolvedValue({
      '/p': { items: [{ id: '1', label: 'Step one', checked: false }] },
    });
    const wrapper = mount(DetailReleaseChecklistCard, {
      props: { info: { path: '/p' } },
      global: { plugins: [createPinia()] },
    });
    await flushPromises();
    expect(wrapper.text()).toContain('Reset all');
  });

  it('calls setPreference when loading default checklist', async () => {
    window.releaseManager.getPreference.mockResolvedValue(null);
    window.releaseManager.setPreference.mockResolvedValue(undefined);
    const wrapper = mount(DetailReleaseChecklistCard, {
      props: { info: { path: '/proj' } },
      global: { plugins: [createPinia()] },
    });
    await flushPromises();
    const useDefaultBtn = wrapper.findAll('button').find((b) => b.text().trim() === 'Use default checklist');
    expect(useDefaultBtn).toBeDefined();
    await useDefaultBtn.trigger('click');
    await flushPromises();
    expect(window.releaseManager.setPreference).toHaveBeenCalledWith('projectReleaseChecklist', expect.any(Object));
    const call = window.releaseManager.setPreference.mock.calls[0][1];
    expect(call['/proj']).toBeDefined();
    expect(Array.isArray(call['/proj'].items)).toBe(true);
    expect(call['/proj'].items.length).toBeGreaterThan(0);
  });
});
