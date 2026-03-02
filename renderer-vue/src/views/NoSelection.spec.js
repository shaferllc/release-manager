import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import NoSelection from './NoSelection.vue';

describe('NoSelection', () => {
  it('renders message to select a project', () => {
    const wrapper = mount(NoSelection);
    expect(wrapper.text()).toContain('Select a project from the list');
    expect(wrapper.text()).toContain('or add one with the button above');
  });

  it('has a root div with expected classes', () => {
    const wrapper = mount(NoSelection);
    const div = wrapper.find('div');
    expect(div.exists()).toBe(true);
    expect(div.classes()).toContain('flex-1');
  });
});
