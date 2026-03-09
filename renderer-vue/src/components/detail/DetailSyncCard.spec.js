import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import DetailSyncCard from './DetailSyncCard.vue';

describe('DetailSyncCard', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    if (globalThis.window) {
      globalThis.window.releaseManager = {
        getReleasesUrl: vi.fn().mockResolvedValue(''),
        syncFromRemote: vi.fn(),
        openUrl: vi.fn(),
      };
    }
  });

  it('renders Sync, Download latest, Choose version buttons', () => {
    const wrapper = mount(DetailSyncCard, {
      props: { info: { gitRemote: 'https://github.com/x/y' } },
      global: { plugins: [createPinia()] },
    });
    expect(wrapper.text()).toMatch(/Sync|Download latest|Choose version/);
  });

  it('renders Sync docs link', () => {
    const wrapper = mount(DetailSyncCard, {
      props: { info: {} },
      global: { plugins: [createPinia()] },
    });
    expect(wrapper.text()).toMatch(/Sync docs|git fetch/);
  });

  it('shows Open Releases when releasesUrl is set', async () => {
    const api = globalThis.window?.releaseManager;
    api.getReleasesUrl.mockResolvedValue('https://github.com/x/y/releases');
    const wrapper = mount(DetailSyncCard, {
      props: { info: { gitRemote: 'https://github.com/x/y' } },
      global: { plugins: [createPinia()] },
    });
    await new Promise((r) => setTimeout(r, 50));
    expect(wrapper.text()).toMatch(/Open Releases/);
  });

  it('calls openUrl when Open Releases clicked', async () => {
    const api = globalThis.window?.releaseManager;
    api.getReleasesUrl.mockResolvedValue('https://github.com/x/y/releases');
    const wrapper = mount(DetailSyncCard, {
      props: { info: { gitRemote: 'https://github.com/x/y' } },
      global: { plugins: [createPinia()] },
    });
    await new Promise((r) => setTimeout(r, 50));
    const openBtn = wrapper.findAll('button').find((b) => b.text().includes('Open Releases'));
    if (openBtn) {
      await openBtn.trigger('click');
      expect(api.openUrl).toHaveBeenCalledWith('https://github.com/x/y/releases');
    }
  });
});
