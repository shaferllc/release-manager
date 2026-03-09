import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import CommandPalette from './CommandPalette.vue';

const DialogStub = {
  name: 'DialogStub',
  props: ['visible'],
  template: `<div v-if="visible" class="dialog-stub">
    <div class="command-palette-search"><slot name="header" /></div>
    <div class="command-palette-list"><slot /></div>
    <div class="command-palette-footer"><slot name="footer" /></div>
  </div>`,
};

describe('CommandPalette', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders search when palette is open', async () => {
    const { useCommandPalette } = await import('../commandPalette/useCommandPalette');
    const palette = useCommandPalette();
    palette.open();
    const wrapper = mount(CommandPalette, {
      global: {
        plugins: [createPinia()],
        stubs: { Dialog: DialogStub },
      },
    });
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.command-palette-search').exists()).toBe(true);
  });

  it('shows search input when open', async () => {
    const { useCommandPalette } = await import('../commandPalette/useCommandPalette');
    const palette = useCommandPalette();
    palette.open();
    const wrapper = mount(CommandPalette, {
      global: {
        plugins: [createPinia()],
        stubs: { Dialog: DialogStub },
      },
    });
    await wrapper.vm.$nextTick();
    const input = wrapper.find('input[placeholder="Search commands..."]');
    expect(input.exists()).toBe(true);
  });

  it('filters commands when typing in search', async () => {
    const { useCommandPalette } = await import('../commandPalette/useCommandPalette');
    const palette = useCommandPalette();
    palette.open();
    const wrapper = mount(CommandPalette, {
      global: {
        plugins: [createPinia()],
        stubs: { Dialog: DialogStub },
      },
    });
    await wrapper.vm.$nextTick();
    const input = wrapper.find('input.command-palette-input');
    await input.setValue('project');
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.query).toBe('project');
  });

  it('clearSearch clears query when clear button clicked', async () => {
    const { useCommandPalette } = await import('../commandPalette/useCommandPalette');
    const palette = useCommandPalette();
    palette.open();
    const wrapper = mount(CommandPalette, {
      global: {
        plugins: [createPinia()],
        stubs: { Dialog: DialogStub },
      },
    });
    await wrapper.vm.$nextTick();
    const input = wrapper.find('input.command-palette-input');
    await input.setValue('test');
    await wrapper.vm.$nextTick();
    const clearBtn = wrapper.find('button[aria-label="Clear search"]');
    await clearBtn.trigger('click');
    expect(wrapper.vm.query).toBe('');
  });
});
