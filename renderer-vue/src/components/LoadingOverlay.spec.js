import { describe, it, expect, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import LoadingOverlay from './LoadingOverlay.vue';

describe('LoadingOverlay', () => {
  let wrapper;

  afterEach(() => {
    wrapper?.unmount();
  });

  it('teleports content to body; has role and aria-label when visible', async () => {
    const pinia = createPinia();
    wrapper = mount(LoadingOverlay, { global: { plugins: [pinia] } });
    await wrapper.vm.$nextTick();
    const el = document.body.querySelector('[role="status"]');
    expect(el).not.toBeNull();
    expect(el?.getAttribute('aria-label')).toBe('Loading');
  });

  it('teleported content includes Working… text', async () => {
    const pinia = createPinia();
    wrapper = mount(LoadingOverlay, { global: { plugins: [pinia] } });
    await wrapper.vm.$nextTick();
    expect(document.body.textContent).toContain('Working…');
  });
});
