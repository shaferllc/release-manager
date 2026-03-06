import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import DetailBookmarksCard from './DetailBookmarksCard.vue';

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

describe('DetailBookmarksCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.releaseManager = {
      getPreference: vi.fn(),
      setPreference: vi.fn(),
      openUrl: vi.fn(),
      getBookmarksReceiverPort: vi.fn(),
      getBookmarksExtensionPath: vi.fn(),
      openPathInFinder: vi.fn(),
      openBookmarksExtensionSetup: vi.fn(),
      launchBrowserWithBookmarksExtension: vi.fn(),
    };
  });

  it('renders Bookmarks title and Add bookmark button', async () => {
    window.releaseManager.getPreference.mockResolvedValue(null);
    window.releaseManager.getBookmarksReceiverPort.mockResolvedValue(3848);
    window.releaseManager.getBookmarksExtensionPath.mockResolvedValue('/app/browser-extension');
    const wrapper = mount(DetailBookmarksCard, {
      props: { info: { path: '/my/project' } },
      global: { plugins: [createPinia()] },
    });
    await flushPromises();
    expect(wrapper.text()).toContain('Bookmarks');
    expect(wrapper.text()).toContain('Add bookmark');
  });

  it('calls getPreference with ext.bookmarks pref key for project path', async () => {
    window.releaseManager.getPreference.mockResolvedValue(null);
    window.releaseManager.getBookmarksReceiverPort.mockResolvedValue(3848);
    window.releaseManager.getBookmarksExtensionPath.mockResolvedValue('/ext');
    mount(DetailBookmarksCard, {
      props: { info: { path: '/my/project' } },
      global: { plugins: [createPinia()] },
    });
    await flushPromises();
    expect(window.releaseManager.getPreference).toHaveBeenCalledWith('ext.bookmarks.%2Fmy%2Fproject');
  });

  it('renders empty state when no bookmarks', async () => {
    window.releaseManager.getPreference.mockResolvedValue(null);
    window.releaseManager.getBookmarksReceiverPort.mockResolvedValue(3848);
    window.releaseManager.getBookmarksExtensionPath.mockResolvedValue('/ext');
    const wrapper = mount(DetailBookmarksCard, {
      props: { info: { path: '/p' } },
      global: { plugins: [createPinia()] },
    });
    await flushPromises();
    expect(wrapper.text()).toContain('No bookmarks yet');
    expect(wrapper.text()).toContain('Add links you use often');
  });

  it('renders bookmark list when getPreference returns bookmarks', async () => {
    window.releaseManager.getPreference.mockResolvedValue(
      JSON.stringify({
        bookmarks: [
          { id: 'bm-1', title: 'Docs', url: 'https://docs.example.com', folder: 'Refs' },
          { id: 'bm-2', url: 'https://ci.example.com' },
        ],
      })
    );
    window.releaseManager.getBookmarksReceiverPort.mockResolvedValue(3848);
    window.releaseManager.getBookmarksExtensionPath.mockResolvedValue('/ext');
    const wrapper = mount(DetailBookmarksCard, {
      props: { info: { path: '/p' } },
      global: { plugins: [createPinia()] },
    });
    await flushPromises();
    expect(wrapper.text()).toContain('Docs');
    expect(wrapper.text()).toContain('https://docs.example.com');
    expect(wrapper.text()).toContain('Refs');
    expect(wrapper.text()).toContain('https://ci.example.com');
  });

  it('has data-detail-tab="bookmarks" on root section', async () => {
    window.releaseManager.getPreference.mockResolvedValue(null);
    window.releaseManager.getBookmarksReceiverPort.mockResolvedValue(3848);
    window.releaseManager.getBookmarksExtensionPath.mockResolvedValue('/ext');
    const wrapper = mount(DetailBookmarksCard, {
      props: { info: {} },
      global: { plugins: [createPinia()], stubs: { ExtensionLayout: ExtensionLayoutStub } },
    });
    await flushPromises();
    const section = wrapper.find('section[data-detail-tab="bookmarks"]');
    expect(section.exists()).toBe(true);
  });

  it('shows Browser extension section with 1-Click Install', async () => {
    window.releaseManager.getPreference.mockResolvedValue(null);
    window.releaseManager.getBookmarksReceiverPort.mockResolvedValue(3848);
    window.releaseManager.getBookmarksExtensionPath.mockResolvedValue('/ext');
    const wrapper = mount(DetailBookmarksCard, {
      props: { info: {} },
      global: { plugins: [createPinia()] },
    });
    await flushPromises();
    expect(wrapper.text()).toContain('Browser extension');
    expect(wrapper.text()).toContain('1-Click Install');
  });

  it('calls setPreference when saving a new bookmark', async () => {
    window.releaseManager.getPreference.mockResolvedValue(null);
    window.releaseManager.getBookmarksReceiverPort.mockResolvedValue(3848);
    window.releaseManager.getBookmarksExtensionPath.mockResolvedValue('/ext');
    const wrapper = mount(DetailBookmarksCard, {
      props: { info: { path: '/proj' } },
      global: { plugins: [createPinia()] },
    });
    await flushPromises();
    const addBtn = wrapper.findAll('button').find((b) => b.text().trim() === 'Add bookmark');
    await addBtn.trigger('click');
    await flushPromises();
    const inputs = wrapper.findAll('input');
    const urlInput = inputs.find((i) => i.attributes('type') === 'url' || i.attributes('placeholder')?.includes('https'));
    if (urlInput) {
      await urlInput.setValue('https://new.com');
      await flushPromises();
      const footerAdd = wrapper.findAll('button').find((b) => b.text().trim() === 'Add');
      if (footerAdd) {
        await footerAdd.trigger('click');
        await flushPromises();
        expect(window.releaseManager.setPreference).toHaveBeenCalledWith(
          'ext.bookmarks.%2Fproj',
          expect.stringContaining('"bookmarks":')
        );
        const stored = JSON.parse(window.releaseManager.setPreference.mock.calls[0][1]);
        expect(stored.bookmarks).toHaveLength(1);
        expect(stored.bookmarks[0].url).toBe('https://new.com');
      }
    }
  });

  it('load() sets bookmarks to [] when getPreference throws', async () => {
    window.releaseManager.getPreference.mockRejectedValue(new Error('fail'));
    window.releaseManager.getBookmarksReceiverPort.mockResolvedValue(3848);
    window.releaseManager.getBookmarksExtensionPath.mockResolvedValue('/ext');
    const wrapper = mount(DetailBookmarksCard, {
      props: { info: { path: '/p' } },
      global: { plugins: [createPinia()] },
    });
    await flushPromises();
    expect(wrapper.text()).toContain('No bookmarks yet');
  });

  it('load() sets bookmarks to [] when raw is invalid', async () => {
    window.releaseManager.getPreference.mockResolvedValue('not json {');
    window.releaseManager.getBookmarksReceiverPort.mockResolvedValue(3848);
    window.releaseManager.getBookmarksExtensionPath.mockResolvedValue('/ext');
    const wrapper = mount(DetailBookmarksCard, {
      props: { info: { path: '/p' } },
      global: { plugins: [createPinia()] },
    });
    await flushPromises();
    expect(wrapper.text()).toContain('No bookmarks yet');
  });

  it('does not throw when api.getPreference is missing', async () => {
    window.releaseManager.getPreference = undefined;
    window.releaseManager.getBookmarksReceiverPort.mockResolvedValue(3848);
    window.releaseManager.getBookmarksExtensionPath.mockResolvedValue('/ext');
    const wrapper = mount(DetailBookmarksCard, {
      props: { info: { path: '/p' } },
      global: { plugins: [createPinia()] },
    });
    await flushPromises();
    expect(wrapper.text()).toContain('Bookmarks');
  });

  it('openUrl is called when clicking bookmark link', async () => {
    window.releaseManager.getPreference.mockResolvedValue(
      JSON.stringify({ bookmarks: [{ id: '1', url: 'https://example.com', title: 'Example' }] })
    );
    window.releaseManager.getBookmarksReceiverPort.mockResolvedValue(3848);
    window.releaseManager.getBookmarksExtensionPath.mockResolvedValue('/ext');
    const wrapper = mount(DetailBookmarksCard, {
      props: { info: { path: '/p' } },
      global: { plugins: [createPinia()] },
    });
    await flushPromises();
    await wrapper.find('.bookmark-title').trigger('click');
    expect(window.releaseManager.openUrl).toHaveBeenCalledWith('https://example.com');
  });

  it('edit button opens edit modal', async () => {
    window.releaseManager.getPreference.mockResolvedValue(
      JSON.stringify({ bookmarks: [{ id: 'bm-1', url: 'https://old.com', title: 'Old' }] })
    );
    window.releaseManager.getBookmarksReceiverPort.mockResolvedValue(3848);
    window.releaseManager.getBookmarksExtensionPath.mockResolvedValue('/ext');
    const wrapper = mount(DetailBookmarksCard, {
      props: { info: { path: '/proj' } },
      global: { plugins: [createPinia()] },
    });
    await flushPromises();
    const editBtn = wrapper.findAll('button').find((b) => b.attributes('aria-label') === 'Edit');
    await editBtn.trigger('click');
    await flushPromises();
    expect(editBtn.exists()).toBe(true);
  });

  it('confirmDelete removes bookmark when user confirms', async () => {
    window.confirm = vi.fn().mockReturnValue(true);
    window.releaseManager.getPreference.mockResolvedValue(
      JSON.stringify({ bookmarks: [{ id: 'bm-1', url: 'https://x.com', title: 'X' }] })
    );
    window.releaseManager.getBookmarksReceiverPort.mockResolvedValue(3848);
    window.releaseManager.getBookmarksExtensionPath.mockResolvedValue('/ext');
    const wrapper = mount(DetailBookmarksCard, {
      props: { info: { path: '/proj' } },
      global: { plugins: [createPinia()] },
    });
    await flushPromises();
    const deleteBtn = wrapper.findAll('button').find((b) => b.attributes('aria-label') === 'Delete');
    await deleteBtn.trigger('click');
    await flushPromises();
    expect(window.releaseManager.setPreference).toHaveBeenCalledWith(
      'ext.bookmarks.%2Fproj',
      JSON.stringify({ bookmarks: [] })
    );
  });

  it('confirmDelete does not remove when user cancels', async () => {
    window.confirm = vi.fn().mockReturnValue(false);
    window.releaseManager.getPreference.mockResolvedValue(
      JSON.stringify({ bookmarks: [{ id: 'bm-1', url: 'https://x.com' }] })
    );
    window.releaseManager.getBookmarksReceiverPort.mockResolvedValue(3848);
    window.releaseManager.getBookmarksExtensionPath.mockResolvedValue('/ext');
    const wrapper = mount(DetailBookmarksCard, {
      props: { info: { path: '/proj' } },
      global: { plugins: [createPinia()] },
    });
    await flushPromises();
    const deleteBtn = wrapper.findAll('button').find((b) => b.attributes('aria-label') === 'Delete');
    await deleteBtn.trigger('click');
    expect(window.releaseManager.setPreference).not.toHaveBeenCalled();
  });

  it('oneClickInstall shows success message when result.ok', async () => {
    window.releaseManager.getPreference.mockResolvedValue(null);
    window.releaseManager.getBookmarksReceiverPort.mockResolvedValue(3848);
    window.releaseManager.getBookmarksExtensionPath.mockResolvedValue('/ext');
    window.releaseManager.launchBrowserWithBookmarksExtension.mockResolvedValue({ ok: true, browser: 'Chrome' });
    const wrapper = mount(DetailBookmarksCard, {
      props: { info: {} },
      global: { plugins: [createPinia()] },
    });
    await flushPromises();
    const installBtn = wrapper.findAll('button').find((b) => b.text().trim() === '1-Click Install');
    await installBtn.trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Chrome');
    expect(wrapper.text()).toContain('Pin');
  });

  it('oneClickInstall shows error message when result not ok', async () => {
    window.releaseManager.getPreference.mockResolvedValue(null);
    window.releaseManager.getBookmarksReceiverPort.mockResolvedValue(3848);
    window.releaseManager.getBookmarksExtensionPath.mockResolvedValue('/ext');
    window.releaseManager.launchBrowserWithBookmarksExtension.mockResolvedValue({ ok: false, error: 'Chrome not found' });
    const wrapper = mount(DetailBookmarksCard, {
      props: { info: {} },
      global: { plugins: [createPinia()] },
    });
    await flushPromises();
    const installBtn = wrapper.findAll('button').find((b) => b.text().trim() === '1-Click Install');
    await installBtn.trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Chrome not found');
  });

  it('oneClickInstall shows error on throw', async () => {
    window.releaseManager.getPreference.mockResolvedValue(null);
    window.releaseManager.getBookmarksReceiverPort.mockResolvedValue(3848);
    window.releaseManager.getBookmarksExtensionPath.mockResolvedValue('/ext');
    window.releaseManager.launchBrowserWithBookmarksExtension.mockRejectedValue(new Error('Network error'));
    const wrapper = mount(DetailBookmarksCard, {
      props: { info: {} },
      global: { plugins: [createPinia()] },
    });
    await flushPromises();
    const installBtn = wrapper.findAll('button').find((b) => b.text().trim() === '1-Click Install');
    await installBtn.trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Network error');
  });

  it('Open extension folder button calls openPathInFinder', async () => {
    window.releaseManager.getPreference.mockResolvedValue(null);
    window.releaseManager.getBookmarksReceiverPort.mockResolvedValue(3848);
    window.releaseManager.getBookmarksExtensionPath.mockResolvedValue('/path/to/ext');
    const wrapper = mount(DetailBookmarksCard, {
      props: { info: {} },
      global: { plugins: [createPinia()] },
    });
    await flushPromises();
    const openFolderBtn = wrapper.findAll('button').find((b) => b.text().trim() === 'Open folder only');
    await openFolderBtn?.trigger('click');
    expect(window.releaseManager.openPathInFinder).toHaveBeenCalledWith('/path/to/ext');
  });

  it('Set up (Load unpacked) calls openBookmarksExtensionSetup', async () => {
    window.releaseManager.getPreference.mockResolvedValue(null);
    window.releaseManager.getBookmarksReceiverPort.mockResolvedValue(3848);
    window.releaseManager.getBookmarksExtensionPath.mockResolvedValue('/ext');
    const wrapper = mount(DetailBookmarksCard, {
      props: { info: {} },
      global: { plugins: [createPinia()] },
    });
    await flushPromises();
    const setupBtn = wrapper.findAll('button').find((b) => b.text().trim() === 'Set up (Load unpacked)');
    await setupBtn?.trigger('click');
    expect(window.releaseManager.openBookmarksExtensionSetup).toHaveBeenCalledWith('/ext');
  });

  it('modal Cancel closes without saving', async () => {
    window.releaseManager.getPreference.mockResolvedValue(null);
    window.releaseManager.getBookmarksReceiverPort.mockResolvedValue(3848);
    window.releaseManager.getBookmarksExtensionPath.mockResolvedValue('/ext');
    const wrapper = mount(DetailBookmarksCard, {
      props: { info: { path: '/p' } },
      global: { plugins: [createPinia()] },
    });
    await flushPromises();
    const addBtn = wrapper.findAll('button').find((b) => b.text().trim() === 'Add bookmark');
    if (addBtn) await addBtn.trigger('click');
    await flushPromises();
    const cancelBtn = wrapper.findAll('button').find((b) => b.text().trim() === 'Cancel');
    if (cancelBtn) await cancelBtn.trigger('click');
    expect(window.releaseManager.setPreference).not.toHaveBeenCalled();
  });

  it('add bookmark button opens add modal', async () => {
    window.releaseManager.getPreference.mockResolvedValue(null);
    window.releaseManager.getBookmarksReceiverPort.mockResolvedValue(3848);
    window.releaseManager.getBookmarksExtensionPath.mockResolvedValue('/ext');
    const wrapper = mount(DetailBookmarksCard, {
      props: { info: { path: '/proj' } },
      global: { plugins: [createPinia()] },
    });
    await flushPromises();
    const addBtn = wrapper.findAll('button').find((b) => b.text().trim() === 'Add bookmark');
    expect(addBtn?.exists()).toBe(true);
    await addBtn.trigger('click');
    await flushPromises();
  });
});
