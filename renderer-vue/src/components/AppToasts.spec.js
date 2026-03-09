import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import AppToasts from './AppToasts.vue';

describe('AppToasts', () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    const { useNotifications } = await import('../composables/useNotifications');
    useNotifications().toasts.value = [];
  });

  it('renders app-toasts container', () => {
    const wrapper = mount(AppToasts, { global: { plugins: [createPinia()] } });
    expect(wrapper.find('.app-toasts').exists()).toBe(true);
  });

  it('renders toast when added via useNotifications', async () => {
    const { useNotifications } = await import('../composables/useNotifications');
    const { add } = useNotifications();
    add({ title: 'Test', type: 'success' });
    const wrapper = mount(AppToasts, { global: { plugins: [createPinia()] } });
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('Test');
  });

  it('dismiss button triggers remove', async () => {
    const { useNotifications } = await import('../composables/useNotifications');
    const { add, toasts } = useNotifications();
    const id = add({ title: 'Dismiss me', type: 'info', duration: 0 });
    const wrapper = mount(AppToasts, { global: { plugins: [createPinia()] } });
    await wrapper.vm.$nextTick();
    expect(toasts.value.some((t) => t.id === id)).toBe(true);
    const dismissBtn = wrapper.find('.app-toast-dismiss');
    await dismissBtn.trigger('click');
    await wrapper.vm.$nextTick();
    expect(toasts.value.filter((t) => t.id === id).length).toBe(0);
  });
});
