import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import DetailBookmarksCard from '../../../extracted-extensions/shipwell-ext-bookmarks/src/DetailBookmarksCard.vue';

describe('DetailBookmarksCard', () => {
  let getPreference;
  let setPreference;
  let openUrl;
  let copyToClipboard;
  let confirmSpy;
  let lastWrapper;

  beforeEach(() => {
    setActivePinia(createPinia());
    getPreference = vi.fn().mockResolvedValue(undefined);
    setPreference = vi.fn().mockResolvedValue();
    openUrl = vi.fn();
    copyToClipboard = vi.fn().mockResolvedValue();
    confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    if (typeof window !== 'undefined') {
      window.releaseManager = {
        getPreference,
        setPreference,
        openUrl,
        copyToClipboard,
      };
    }
  });

  afterEach(() => {
    confirmSpy?.mockRestore();
    lastWrapper?.unmount();
    lastWrapper = null;
  });

  function mountCard(props = {}) {
    lastWrapper?.unmount();
    lastWrapper = mount(DetailBookmarksCard, {
      props: { info: { path: '/test/project', ...props.info } },
      global: { plugins: [createPinia()] },
      attachTo: document.body,
    });
    return lastWrapper;
  }

  it('renders with empty state when no bookmarks', async () => {
    getPreference.mockResolvedValue(undefined);
    const wrapper = mountCard();
    await wrapper.vm.$nextTick();
    await vi.waitFor(() => {
      expect(wrapper.find('.empty-state').exists()).toBe(true);
    });
    expect(wrapper.text()).toContain('No bookmarks yet');
    expect(wrapper.text()).toContain('Add bookmark');
  });

  it('loads bookmarks from preferences on mount', async () => {
    const data = { bookmarks: [{ id: 'b1', url: 'https://a.com', title: 'A' }] };
    getPreference.mockResolvedValue(JSON.stringify(data));
    const wrapper = mountCard();
    await vi.waitFor(() => {
      expect(getPreference).toHaveBeenCalled();
    });
    expect(getPreference).toHaveBeenCalledWith('ext.bookmarks.%2Ftest%2Fproject');
  });

  it('loads bookmarks when raw object returned (not string)', async () => {
    const data = { bookmarks: [{ id: 'b1', url: 'https://x.com', title: 'X' }] };
    getPreference.mockResolvedValue(data);
    const wrapper = mountCard();
    await vi.waitFor(() => {
      expect(wrapper.find('.bookmark-row').exists()).toBe(true);
    });
    expect(wrapper.text()).toContain('https://x.com');
    expect(wrapper.text()).toContain('X');
  });

  it('loads bookmarks when raw string returned', async () => {
    const data = { bookmarks: [{ id: 'b1', url: 'https://y.com', title: 'Y' }] };
    getPreference.mockResolvedValue(JSON.stringify(data));
    const wrapper = mountCard();
    await vi.waitFor(() => {
      expect(wrapper.find('.bookmark-row').exists()).toBe(true);
    });
    expect(wrapper.text()).toContain('https://y.com');
  });

  it('loads empty array when getPreference returns invalid JSON', async () => {
    getPreference.mockResolvedValue('not valid json {');
    const wrapper = mountCard();
    await vi.waitFor(() => {
      expect(getPreference).toHaveBeenCalled();
    });
    expect(wrapper.find('.empty-state').exists()).toBe(true);
  });

  it('shows bookmark count when bookmarks exist', async () => {
    const data = {
      bookmarks: [
        { id: 'b1', url: 'https://a.com', title: 'A' },
        { id: 'b2', url: 'https://b.com', title: 'B' },
      ],
    };
    getPreference.mockResolvedValue(JSON.stringify(data));
    const wrapper = mountCard();
    await vi.waitFor(() => {
      expect(wrapper.findAll('.bookmark-row').length).toBeGreaterThan(0);
    });
    expect(wrapper.text()).toMatch(/2.*bookmark/);
  });

  it('opens add modal when Add bookmark clicked', async () => {
    getPreference.mockResolvedValue(undefined);
    const wrapper = mountCard();
    await wrapper.vm.$nextTick();
    const addBtns = wrapper.findAll('button').filter((b) => b.text().includes('Add bookmark'));
    expect(addBtns.length).toBeGreaterThan(0);
    await addBtns[0].trigger('click');
    await wrapper.vm.$nextTick();
    await vi.waitFor(() => {
      expect(document.querySelector('.bookmarks-modal')).toBeTruthy();
    });
  });

  it('saves new bookmark when form submitted', async () => {
    getPreference.mockResolvedValue(undefined);
    const wrapper = mountCard();
    await wrapper.vm.$nextTick();
    const addBtns = wrapper.findAll('button').filter((b) => b.text().includes('Add bookmark'));
    await addBtns[0].trigger('click');
    await vi.waitFor(() => {
      expect(document.querySelector('.bookmarks-modal')).toBeTruthy();
    });

    const modal = document.querySelector('.bookmarks-modal');
    const urlInput = modal?.querySelector('input[type="url"]');
    const titleInput = modal?.querySelector('input[placeholder*="API docs"]');
    if (titleInput) {
      titleInput.value = 'My Doc';
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    if (urlInput) {
      urlInput.value = 'https://example.com/docs';
      urlInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    await wrapper.vm.$nextTick();

    const addBtn = [...(modal?.querySelectorAll('button') || [])].find((b) => b.textContent?.trim() === 'Add');
    if (addBtn) {
      addBtn.click();
    }
    await wrapper.vm.$nextTick();

    await vi.waitFor(() => {
      expect(setPreference).toHaveBeenCalled();
    });
    const call = setPreference.mock.calls[0];
    const stored = JSON.parse(call[1]);
    expect(stored.bookmarks).toHaveLength(1);
    expect(stored.bookmarks[0].url).toBe('https://example.com/docs');
    expect(stored.bookmarks[0].title).toBe('My Doc');
  });

  it('does not save when URL is empty', async () => {
    getPreference.mockResolvedValue(undefined);
    const wrapper = mountCard();
    await wrapper.vm.$nextTick();
    const addBtns = wrapper.findAll('button').filter((b) => b.text().includes('Add bookmark'));
    await addBtns[0].trigger('click');
    await vi.waitFor(() => {
      expect(document.querySelector('.bookmarks-modal')).toBeTruthy();
    });

    const modal = document.querySelector('.bookmarks-modal');
    const addBtn = [...(modal?.querySelectorAll('button') || [])].find((b) => b.textContent?.trim() === 'Add');
    expect(addBtn).toBeDefined();
    expect(addBtn?.hasAttribute('disabled')).toBe(true);
  });

  it('calls openUrl when Open button clicked', async () => {
    const data = { bookmarks: [{ id: 'b1', url: 'https://open.me', title: 'Open' }] };
    getPreference.mockResolvedValue(JSON.stringify(data));
    const wrapper = mountCard();
    await vi.waitFor(() => {
      expect(wrapper.find('.bookmark-row').exists()).toBe(true);
    });
    const openButtons = wrapper.findAll('button[aria-label="Open"]');
    if (openButtons.length) {
      await openButtons[0].trigger('click');
      expect(openUrl).toHaveBeenCalledWith('https://open.me');
    }
  });

  it('opens edit modal when Edit clicked', async () => {
    const data = { bookmarks: [{ id: 'b1', url: 'https://edit.me', title: 'Edit' }] };
    getPreference.mockResolvedValue(JSON.stringify(data));
    const wrapper = mountCard();
    await vi.waitFor(() => {
      expect(wrapper.find('.bookmark-row').exists()).toBe(true);
    });
    const editButtons = wrapper.findAll('button[aria-label="Edit"]');
    expect(editButtons.length).toBeGreaterThan(0);
    await editButtons[0].trigger('click');
    await vi.waitFor(() => {
      expect(document.querySelector('.bookmarks-modal')).toBeTruthy();
    });
    const urlInput = document.querySelector('.bookmarks-modal input[type="url"]');
    expect(urlInput?.value).toBe('https://edit.me');
  });

  it('deletes bookmark when Delete clicked and confirmed', async () => {
    const data = { bookmarks: [{ id: 'b1', url: 'https://del.me', title: 'Delete' }] };
    getPreference.mockResolvedValue(JSON.stringify(data));
    const wrapper = mountCard();
    await vi.waitFor(() => {
      expect(wrapper.find('.bookmark-row').exists()).toBe(true);
    });
    const deleteButtons = wrapper.findAll('button[aria-label="Delete"]');
    if (deleteButtons.length) {
      await deleteButtons[0].trigger('click');
      await vi.waitFor(() => {
        expect(setPreference).toHaveBeenCalled();
      });
      const call = setPreference.mock.calls[0];
      const stored = JSON.parse(call[1]);
      expect(stored.bookmarks).toHaveLength(0);
    }
  });

  it('does not delete when user cancels confirm', async () => {
    confirmSpy.mockReturnValue(false);
    const data = { bookmarks: [{ id: 'b1', url: 'https://del.me', title: 'Delete' }] };
    getPreference.mockResolvedValue(JSON.stringify(data));
    const wrapper = mountCard();
    await vi.waitFor(() => {
      expect(wrapper.find('.bookmark-row').exists()).toBe(true);
    });
    const deleteButtons = wrapper.findAll('button[aria-label="Delete"]');
    if (deleteButtons.length) {
      await deleteButtons[0].trigger('click');
      await wrapper.vm.$nextTick();
      expect(setPreference).not.toHaveBeenCalled();
    }
  });

  it('sorts bookmarks by folder then title', async () => {
    const data = {
      bookmarks: [
        { id: 'b1', url: 'https://z.com', title: 'Z', folder: 'B' },
        { id: 'b2', url: 'https://a.com', title: 'A', folder: 'A' },
        { id: 'b3', url: 'https://m.com', title: 'M', folder: 'A' },
      ],
    };
    getPreference.mockResolvedValue(JSON.stringify(data));
    const wrapper = mountCard();
    await vi.waitFor(() => {
      expect(wrapper.findAll('.bookmark-row').length).toBe(3);
    });
    const rows = wrapper.findAll('.bookmark-row');
    const titles = rows.map((r) => r.text());
    expect(titles[0]).toMatch(/A/);
    expect(titles[1]).toMatch(/M/);
    expect(titles[2]).toMatch(/Z/);
  });

  it('shows folder and tags when present', async () => {
    const data = {
      bookmarks: [{ id: 'b1', url: 'https://x.com', title: 'X', folder: 'Docs', tags: ['api', 'ref'] }],
    };
    getPreference.mockResolvedValue(JSON.stringify(data));
    const wrapper = mountCard();
    await vi.waitFor(() => {
      expect(wrapper.find('.bookmark-row').exists()).toBe(true);
    });
    expect(wrapper.text()).toContain('Docs');
    expect(wrapper.text()).toContain('api');
    expect(wrapper.text()).toContain('ref');
  });

  it('uses default project path when info.path is empty', async () => {
    getPreference.mockResolvedValue(undefined);
    const wrapper = mount(DetailBookmarksCard, {
      props: { info: null },
      global: { plugins: [createPinia()] },
    });
    await vi.waitFor(() => {
      expect(getPreference).toHaveBeenCalled();
    });
    expect(getPreference).toHaveBeenCalledWith('ext.bookmarks.default');
  });

  it('has data-detail-tab and content-class for layout', async () => {
    getPreference.mockResolvedValue(undefined);
    const wrapper = mountCard();
    await wrapper.vm.$nextTick();
    const panel = wrapper.find('.detail-bookmarks-card');
    expect(panel.exists()).toBe(true);
  });

  it('calls copyToClipboard when Copy URL clicked', async () => {
    const data = { bookmarks: [{ id: 'b1', url: 'https://copy.me', title: 'Copy' }] };
    getPreference.mockResolvedValue(JSON.stringify(data));
    const wrapper = mountCard();
    await vi.waitFor(() => {
      expect(wrapper.find('.bookmark-row').exists()).toBe(true);
    });
    const copyButtons = wrapper.findAll('button[aria-label="Copy URL"]');
    expect(copyButtons.length).toBeGreaterThan(0);
    await copyButtons[0].trigger('click');
    expect(copyToClipboard).toHaveBeenCalledWith('https://copy.me');
  });

  it('shows duplicate warning when adding existing URL', async () => {
    const data = { bookmarks: [{ id: 'b1', url: 'https://existing.com', title: 'Existing' }] };
    getPreference.mockResolvedValue(JSON.stringify(data));
    const wrapper = mountCard();
    await vi.waitFor(() => {
      expect(wrapper.find('.bookmark-row').exists()).toBe(true);
    });
    wrapper.vm.openAddBookmark();
    await wrapper.vm.$nextTick();
    await vi.waitFor(() => {
      expect(document.querySelector('.bookmarks-modal')).toBeTruthy();
    });
    const modal = document.querySelector('.bookmarks-modal');
    const urlInput = modal?.querySelector('input[type="url"]');
    if (urlInput) {
      urlInput.value = 'https://existing.com';
      urlInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    await wrapper.vm.$nextTick();
    const addBtn = [...(modal?.querySelectorAll('button') || [])].find((b) => b.textContent?.trim() === 'Add');
    if (addBtn) addBtn.click();
    await wrapper.vm.$nextTick();
    expect(setPreference).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain('This URL is already bookmarked');
  });

  it('shows bookmark URL when title is missing', async () => {
    const data = { bookmarks: [{ id: 'b1', url: 'https://url-only.com' }] };
    getPreference.mockResolvedValue(JSON.stringify(data));
    const wrapper = mountCard();
    await vi.waitFor(() => {
      expect(wrapper.find('.bookmark-row').exists()).toBe(true);
    });
    expect(wrapper.text()).toContain('https://url-only.com');
  });

  it('shows search input when more than 3 bookmarks', async () => {
    const data = {
      bookmarks: [
        { id: 'b1', url: 'https://a.com', title: 'Alpha' },
        { id: 'b2', url: 'https://b.com', title: 'Beta' },
        { id: 'b3', url: 'https://c.com', title: 'Gamma' },
        { id: 'b4', url: 'https://d.com', title: 'Delta' },
      ],
    };
    getPreference.mockResolvedValue(JSON.stringify(data));
    const wrapper = mountCard();
    await vi.waitFor(() => {
      expect(wrapper.findAll('.bookmark-row').length).toBe(4);
    });
    expect(wrapper.find('input[placeholder*="Search"]').exists()).toBe(true);
  });

  it('filters bookmarks by search query', async () => {
    const data = {
      bookmarks: [
        { id: 'b1', url: 'https://api.example.com', title: 'API Docs' },
        { id: 'b2', url: 'https://other.com', title: 'Other' },
        { id: 'b3', url: 'https://x.com', title: 'X' },
        { id: 'b4', url: 'https://y.com', title: 'Y' },
      ],
    };
    getPreference.mockResolvedValue(JSON.stringify(data));
    const wrapper = mountCard();
    await vi.waitFor(() => {
      expect(wrapper.find('input[placeholder*="Search"]').exists()).toBe(true);
    });
    const searchInput = wrapper.find('input[placeholder*="Search"]');
    await searchInput.setValue('api');
    await wrapper.vm.$nextTick();
    expect(wrapper.findAll('.bookmark-row').length).toBe(1);
    expect(wrapper.text()).toContain('API Docs');
  });
});
