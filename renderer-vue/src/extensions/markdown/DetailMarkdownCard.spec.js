import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import DetailMarkdownCard from './DetailMarkdownCard.vue';

const ExtensionLayoutStub = {
  name: 'ExtensionLayoutStub',
  props: ['tabId', 'contentClass'],
  template: `
    <section :data-detail-tab="tabId" :class="contentClass">
      <div class="extension-toolbar">
        <slot name="toolbar-start" />
        <slot name="toolbar-end" />
      </div>
      <slot />
    </section>
  `,
};

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('DetailMarkdownCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.releaseManager = {
      getProjectFiles: vi.fn(),
      readProjectFile: vi.fn(),
      writeProjectFile: vi.fn(),
      openPathInFinder: vi.fn(),
    };
  });

  it('renders Markdown files sidebar and toolbar text', async () => {
    window.releaseManager.getProjectFiles.mockResolvedValue({ ok: true, files: [] });
    const wrapper = mount(DetailMarkdownCard, {
      props: { info: { path: '/my/project' } },
      global: {
        plugins: [createPinia()],
        stubs: { ExtensionLayout: ExtensionLayoutStub },
        directives: { tooltip: () => {} },
      },
    });
    await flushPromises();
    expect(wrapper.text()).toContain('Markdown files');
    expect(wrapper.text()).toMatch(/Browse and edit Markdown|Select a file/);
  });

  it('shows No .md files found when project has no markdown files', async () => {
    window.releaseManager.getProjectFiles.mockResolvedValue({ ok: true, files: [] });
    const wrapper = mount(DetailMarkdownCard, {
      props: { info: { path: '/proj' } },
      global: {
        plugins: [createPinia()],
        stubs: { ExtensionLayout: ExtensionLayoutStub },
        directives: { tooltip: () => {} },
      },
    });
    await flushPromises();
    expect(wrapper.text()).toContain('No .md files found');
  });
});
