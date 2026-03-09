import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import ApiView from './ApiView.vue';

describe('ApiView', () => {
  const originalReleaseManager = globalThis.window?.releaseManager;

  beforeEach(() => {
    setActivePinia(createPinia());
    if (globalThis.window) {
      globalThis.window.releaseManager = {
        getApiServerEnabled: vi.fn().mockResolvedValue(false),
        setApiServerEnabled: vi.fn(),
        getApiServerPort: vi.fn().mockResolvedValue(3000),
        setApiServerPort: vi.fn(),
        getMcpStatus: vi.fn().mockResolvedValue({ running: false }),
        startMcp: vi.fn(),
        stopMcp: vi.fn(),
      };
    }
  });

  afterEach(() => {
    if (globalThis.window) {
      globalThis.window.releaseManager = originalReleaseManager;
    }
  });

  it('renders API server section', () => {
    const wrapper = mount(ApiView, { global: { plugins: [createPinia()] } });
    expect(wrapper.text()).toMatch(/API server|Control Shipwell over HTTP/);
  });
});
