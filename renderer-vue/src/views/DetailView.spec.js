import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import DetailView from './DetailView.vue';

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('DetailView', () => {
  const originalReleaseManager = globalThis.window?.releaseManager;

  beforeEach(() => {
    const pinia = createPinia();
    setActivePinia(pinia);
    if (globalThis.window) {
      globalThis.window.releaseManager = {
        getProjectInfo: vi.fn().mockResolvedValue({
          ok: true,
          info: {
            path: '/test',
            name: 'test-project',
            version: '1.0.0',
            gitStatus: {},
          },
        }),
      };
    }
  });

  afterEach(() => {
    if (globalThis.window) {
      globalThis.window.releaseManager = originalReleaseManager;
    }
  });

  it('shows loading state initially', () => {
    const wrapper = mount(DetailView, { global: { plugins: [createPinia()] } });
    expect(wrapper.text()).toMatch(/Loading/);
  });

  it('shows project info and tabs when loaded', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test/project';
    const wrapper = mount(DetailView, { global: { plugins: [pinia] } });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 100));
    await flushPromises();
    expect(wrapper.text()).not.toMatch(/Loading/);
    expect(wrapper.text()).toMatch(/Version|Git|Dashboard/);
  });
});
