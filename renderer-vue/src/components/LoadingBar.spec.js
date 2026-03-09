import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import LoadingBar from './LoadingBar.vue';

describe('LoadingBar', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders loading bar with progressbar role when visible', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    store.loadingBarVisible = true;
    mount(LoadingBar, { global: { plugins: [pinia] }, attachTo: document.body });
    const bar = document.body.querySelector('.loading-bar');
    expect(bar).toBeTruthy();
    expect(bar?.getAttribute('role')).toBe('progressbar');
    expect(bar?.getAttribute('aria-label')).toBe('Loading');
  });
});
