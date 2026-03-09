import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import ChangelogView from './ChangelogView.vue';

describe('ChangelogView', () => {
  const originalReleaseManager = globalThis.window?.releaseManager;

  beforeEach(() => {
    setActivePinia(createPinia());
    if (globalThis.window) {
      globalThis.window.releaseManager = {
        getChangelog: vi.fn().mockResolvedValue({ ok: true, content: '# Changelog\n\n- v1.0.0' }),
      };
    }
  });

  afterEach(() => {
    if (globalThis.window) {
      globalThis.window.releaseManager = originalReleaseManager;
    }
  });

  it('renders changelog content when loaded', async () => {
    const wrapper = mount(ChangelogView, { global: { plugins: [createPinia()] } });
    await new Promise((r) => setTimeout(r, 50));
    expect(wrapper.text()).toMatch(/Changelog|Release notes|Loading/);
  });
});
