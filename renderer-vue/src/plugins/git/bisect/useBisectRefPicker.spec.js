import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { defineComponent, h } from 'vue';
import { useBisectRefPicker } from './useBisectRefPicker';

describe('useBisectRefPicker', () => {
  const originalReleaseManager = globalThis.window?.releaseManager;

  beforeEach(() => {
    setActivePinia(createPinia());
    if (globalThis.window) {
      globalThis.window.releaseManager = {
        getCommitLogWithBody: vi.fn(),
        getCommitLog: vi.fn(),
      };
    }
  });

  afterEach(() => {
    if (globalThis.window) {
      globalThis.window.releaseManager = originalReleaseManager;
    }
  });

  let pickerRef;
  function createPicker(opts = {}) {
    const getDirPath = opts.getDirPath ?? (() => '/test/project');
    const getDefaultBad = opts.getDefaultBad ?? (() => 'HEAD');
    const getDefaultGood = opts.getDefaultGood ?? (() => '');
    const emit = opts.emit ?? vi.fn();
    const Wrapper = defineComponent({
      setup() {
        pickerRef = useBisectRefPicker(getDirPath, getDefaultBad, getDefaultGood, emit);
        return pickerRef;
      },
      render: () => h('div'),
    });
    mount(Wrapper, { global: { plugins: [createPinia()] } });
    return pickerRef;
  }

  it('returns refs, browser state, commits, and handlers', () => {
    const picker = createPicker();
    expect(picker.badRef).toBeDefined();
    expect(picker.goodRef).toBeDefined();
    expect(picker.browserOpen).toBeDefined();
    expect(picker.badSearch).toBeDefined();
    expect(picker.goodSearch).toBeDefined();
    expect(picker.commits).toBeDefined();
    expect(picker.commitsLoading).toBeDefined();
    expect(picker.filteredBadCommits).toBeDefined();
    expect(picker.filteredGoodCommits).toBeDefined();
    expect(picker.canStartBisect).toBeDefined();
    expect(picker.startBisectError).toBeDefined();
    expect(picker.toggleBrowser).toBeDefined();
    expect(picker.selectRef).toBeDefined();
    expect(picker.close).toBeDefined();
    expect(picker.confirm).toBeDefined();
  });

  it('initializes badRef and goodRef from getters', () => {
    const picker = createPicker({
      getDefaultBad: () => 'main',
      getDefaultGood: () => 'v1.0',
    });
    expect(picker.badRef.value).toBe('main');
    expect(picker.goodRef.value).toBe('v1.0');
  });

  it('defaults badRef to HEAD when getDefaultBad returns empty', () => {
    const picker = createPicker({ getDefaultBad: () => '' });
    expect(picker.badRef.value).toBe('HEAD');
  });

  it('loads commits on mount', async () => {
    const api = globalThis.window?.releaseManager;
    api.getCommitLogWithBody.mockResolvedValue({
      ok: true,
      commits: [
        { sha: 'abc123', subject: 'Fix bug', author: 'Alice', date: '2024-01-01', body: '' },
        { sha: 'def456', subject: 'Add feature', author: 'Bob', date: '2024-01-02', body: '' },
      ],
    });
    const picker = createPicker();
    await vi.waitFor(() => {
      expect(picker.commitsLoading.value).toBe(false);
    });
    expect(picker.commits.value).toHaveLength(2);
    expect(picker.commits.value[0].sha).toBe('abc123');
  });

  it('uses getCommitLog when getCommitLogWithBody is missing', async () => {
    const api = globalThis.window?.releaseManager;
    delete api.getCommitLogWithBody;
    api.getCommitLog = vi.fn().mockResolvedValue({
      ok: true,
      commits: [{ sha: 'xyz', subject: 'Test', author: 'X', date: '2024', body: '' }],
    });
    const picker = createPicker();
    await vi.waitFor(() => {
      expect(picker.commitsLoading.value).toBe(false);
    });
    expect(picker.commits.value).toHaveLength(1);
    expect(api.getCommitLog).toHaveBeenCalledWith('/test/project', 100);
  });

  it('sets commits to empty when no dirPath', async () => {
    const picker = createPicker({ getDirPath: () => null });
    await vi.waitFor(() => {
      expect(picker.commitsLoading.value).toBe(false);
    });
    expect(picker.commits.value).toEqual([]);
  });

  it('sets commits to empty on API error', async () => {
    const api = globalThis.window?.releaseManager;
    api.getCommitLogWithBody.mockRejectedValue(new Error('Git failed'));
    const picker = createPicker();
    await vi.waitFor(() => {
      expect(picker.commitsLoading.value).toBe(false);
    });
    expect(picker.commits.value).toEqual([]);
  });

  it('filteredBadCommits filters by search', async () => {
    const api = globalThis.window?.releaseManager;
    api.getCommitLogWithBody.mockResolvedValue({
      ok: true,
      commits: [
        { sha: 'abc123', subject: 'Fix bug', author: 'Alice', date: '2024', body: '' },
        { sha: 'def456', subject: 'Add feature', author: 'Bob', date: '2024', body: '' },
      ],
    });
    const picker = createPicker();
    await vi.waitFor(() => {
      expect(picker.commits.value.length).toBe(2);
    });
    expect(picker.filteredBadCommits.value).toHaveLength(2);
    picker.badSearch.value = 'fix';
    expect(picker.filteredBadCommits.value).toHaveLength(1);
    expect(picker.filteredBadCommits.value[0].subject).toBe('Fix bug');
  });

  it('canStartBisect is false when bad or good empty', async () => {
    const api = globalThis.window?.releaseManager;
    api.getCommitLogWithBody.mockResolvedValue({ ok: true, commits: [{ sha: 'a' }, { sha: 'b' }] });
    const picker = createPicker({ getDefaultGood: () => '' });
    await vi.waitFor(() => {
      expect(picker.commits.value.length).toBe(2);
    });
    expect(picker.canStartBisect.value).toBe(false);
  });

  it('canStartBisect is false when bad equals good', async () => {
    const api = globalThis.window?.releaseManager;
    api.getCommitLogWithBody.mockResolvedValue({ ok: true, commits: [{ sha: 'a' }, { sha: 'b' }] });
    const picker = createPicker({ getDefaultBad: () => 'main', getDefaultGood: () => 'main' });
    await vi.waitFor(() => {
      expect(picker.commits.value.length).toBe(2);
    });
    expect(picker.canStartBisect.value).toBe(false);
  });

  it('canStartBisect is true when both refs set and different and commits >= 2', async () => {
    const api = globalThis.window?.releaseManager;
    api.getCommitLogWithBody.mockResolvedValue({ ok: true, commits: [{ sha: 'a' }, { sha: 'b' }] });
    const picker = createPicker({ getDefaultBad: () => 'HEAD', getDefaultGood: () => 'main' });
    await vi.waitFor(() => {
      expect(picker.commits.value.length).toBe(2);
    });
    expect(picker.canStartBisect.value).toBe(true);
  });

  it('startBisectError returns message when bad or good empty', () => {
    const picker = createPicker({ getDefaultGood: () => '' });
    expect(picker.startBisectError.value).toBe('Set both bad and good refs.');
  });

  it('startBisectError returns message when bad equals good', () => {
    const picker = createPicker({ getDefaultBad: () => 'x', getDefaultGood: () => 'x' });
    expect(picker.startBisectError.value).toBe('Bad and good must be different commits.');
  });

  it('toggleBrowser opens and closes browser', () => {
    const picker = createPicker();
    expect(picker.browserOpen.value).toBeNull();
    picker.toggleBrowser('bad');
    expect(picker.browserOpen.value).toBe('bad');
    picker.toggleBrowser('bad');
    expect(picker.browserOpen.value).toBeNull();
  });

  it('selectRef sets badRef and closes browser', () => {
    const picker = createPicker({ getDefaultGood: () => 'other' });
    picker.browserOpen.value = 'bad';
    picker.selectRef('bad', 'abc123');
    expect(picker.badRef.value).toBe('abc123');
    expect(picker.browserOpen.value).toBeNull();
  });

  it('selectRef sets goodRef and closes browser', () => {
    const picker = createPicker({ getDefaultBad: () => 'other' });
    picker.browserOpen.value = 'good';
    picker.selectRef('good', 'def456');
    expect(picker.goodRef.value).toBe('def456');
    expect(picker.browserOpen.value).toBeNull();
  });

  it('selectRef bad ignores when sha equals goodRef', () => {
    const picker = createPicker({ getDefaultBad: () => 'HEAD', getDefaultGood: () => 'abc123' });
    picker.selectRef('bad', 'abc123');
    expect(picker.badRef.value).toBe('HEAD');
  });

  it('selectRef good ignores when sha equals badRef', () => {
    const picker = createPicker({ getDefaultBad: () => 'def456', getDefaultGood: () => '' });
    picker.selectRef('good', 'def456');
    expect(picker.goodRef.value).toBe('');
  });

  it('close emits close', () => {
    const emit = vi.fn();
    const picker = createPicker({ emit });
    picker.close();
    expect(emit).toHaveBeenCalledWith('close');
  });

  it('confirm emits confirm and close when canStartBisect', async () => {
    const api = globalThis.window?.releaseManager;
    api.getCommitLogWithBody.mockResolvedValue({ ok: true, commits: [{ sha: 'a' }, { sha: 'b' }] });
    const emit = vi.fn();
    const picker = createPicker({ emit, getDefaultBad: () => 'HEAD', getDefaultGood: () => 'main' });
    await vi.waitFor(() => {
      expect(picker.canStartBisect.value).toBe(true);
    });
    picker.confirm();
    expect(emit).toHaveBeenCalledWith('confirm', { badRef: 'HEAD', goodRef: 'main' });
    expect(emit).toHaveBeenCalledWith('close');
  });

  it('confirm does nothing when !canStartBisect', () => {
    const emit = vi.fn();
    const picker = createPicker({ emit, getDefaultGood: () => '' });
    picker.confirm();
    expect(emit).not.toHaveBeenCalled();
  });
});
