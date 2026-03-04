import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { ref } from 'vue';

vi.mock('../composables/useLicense', () => ({ useLicense: () => ({ hasLicense: ref(true) }) }));

import Sidebar from './Sidebar.vue';

describe('Sidebar', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders Projects title and empty hint when no projects', () => {
    const wrapper = mount(Sidebar, {
      global: { plugins: [createPinia()] },
    });
    expect(wrapper.text()).toContain('Projects');
    expect(wrapper.text()).toContain('Add project');
  });

  it('shows project list when store has projects', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    store.setProjects([{ path: '/foo', name: 'Foo' }]);
    const wrapper = mount(Sidebar, {
      global: { plugins: [pinia] },
    });
    expect(wrapper.text()).toContain('Foo');
  });

  it('selects project when row is clicked', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    store.setProjects([{ path: '/foo', name: 'Foo' }]);
    const wrapper = mount(Sidebar, {
      global: { plugins: [pinia] },
    });
    await wrapper.find('.project-list-item').trigger('click');
    expect(store.selectedPath).toBe('/foo');
  });

  it('toggles selection when checkbox is clicked', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    store.setProjects([{ path: '/foo', name: 'Foo' }]);
    const wrapper = mount(Sidebar, {
      global: { plugins: [pinia] },
    });
    const checkbox = wrapper.find('input[type="checkbox"]');
    await checkbox.trigger('click');
    expect(store.selectedPaths?.has?.('/foo')).toBe(true);
  });

  it('calls toggleStar when star button is clicked', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    store.setProjects([{ path: '/foo', name: 'Foo', starred: false }]);
    const setProjectsSpy = vi.fn().mockResolvedValue(undefined);
    window.releaseManager.setProjects = setProjectsSpy;
    const wrapper = mount(Sidebar, {
      global: { plugins: [pinia] },
    });
    const starBtn = wrapper.find('.project-star-btn');
    await starBtn.trigger('click');
    expect(store.projects[0].starred).toBe(true);
    expect(setProjectsSpy).toHaveBeenCalled();
  });

  it('hides batch bar when fewer than 2 selected', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    store.setProjects([{ path: '/foo', name: 'Foo', type: 'npm' }]);
    store.toggleProjectSelection('/foo');
    const wrapper = mount(Sidebar, {
      global: { plugins: [pinia] },
    });
    expect(wrapper.find('.batch-bar').exists()).toBe(false);
  });

  it('batchRelease calls api.release for npm projects when 2+ selected and user confirms', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    store.setProjects([
      { path: '/a', name: 'A', type: 'npm' },
      { path: '/b', name: 'B', type: 'npm' },
    ]);
    store.toggleProjectSelection('/a');
    store.toggleProjectSelection('/b');
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const releaseSpy = vi.fn();
    window.releaseManager.release = releaseSpy;
    const wrapper = mount(Sidebar, {
      global: { plugins: [pinia] },
    });
    const patchBtn = wrapper.find('.batch-bar-buttons button');
    await patchBtn.trigger('click');
    expect(confirmSpy).toHaveBeenCalled();
    expect(releaseSpy).toHaveBeenCalledWith('/a', 'patch', false, {});
    expect(releaseSpy).toHaveBeenCalledWith('/b', 'patch', false, {});
    expect(store.selectedPaths.size).toBe(0);
    confirmSpy.mockRestore();
  });

  it('batchRelease does nothing when user cancels confirm', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    store.setProjects([
      { path: '/a', name: 'A', type: 'npm' },
      { path: '/b', name: 'B', type: 'npm' },
    ]);
    store.toggleProjectSelection('/a');
    store.toggleProjectSelection('/b');
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const releaseSpy = vi.fn();
    window.releaseManager.release = releaseSpy;
    const wrapper = mount(Sidebar, {
      global: { plugins: [pinia] },
    });
    const patchBtn = wrapper.find('.batch-bar-buttons button');
    await patchBtn.trigger('click');
    expect(releaseSpy).not.toHaveBeenCalled();
  });

  it('calls removeProject when remove is clicked and user confirms', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    store.setProjects([{ path: '/foo', name: 'Foo' }]);
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const setProjectsSpy = vi.fn().mockResolvedValue(undefined);
    window.releaseManager.setProjects = setProjectsSpy;
    const wrapper = mount(Sidebar, {
      global: { plugins: [pinia] },
    });
    const removeBtn = wrapper.find('.project-remove-btn');
    await removeBtn.trigger('click');
    expect(confirmSpy).toHaveBeenCalledWith('Remove "Foo" from the list?');
    expect(store.projects).toHaveLength(0);
    expect(setProjectsSpy).toHaveBeenCalled();
    confirmSpy.mockRestore();
  });
});
