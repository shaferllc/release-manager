import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useDiffSideBySide } from './useDiffSideBySide';

describe('useDiffSideBySide', () => {
  const originalReleaseManager = globalThis.window?.releaseManager;
  const originalConfirm = window.confirm;

  beforeEach(() => {
    if (globalThis.window) {
      globalThis.window.releaseManager = {
        getFileDiffStructured: vi.fn(),
        revertFileLine: vi.fn(),
        discardFile: vi.fn(),
        copyToClipboard: vi.fn(),
      };
    }
  });

  afterEach(() => {
    window.confirm = originalConfirm;
    if (globalThis.window) {
      globalThis.window.releaseManager = originalReleaseManager;
    }
  });
  it('returns loading, error, rows, rowTypeClass, displayTitle, close, etc.', () => {
    const emit = () => {};
    const result = useDiffSideBySide(
      () => '/path',
      () => 'file.js',
      () => '',
      () => false,
      () => '',
      emit
    );
    expect(result).toHaveProperty('loading');
    expect(result).toHaveProperty('error');
    expect(result).toHaveProperty('rows');
    expect(result).toHaveProperty('rowTypeClass');
    expect(result).toHaveProperty('displayTitle');
    expect(result).toHaveProperty('close');
  });

  it('rowTypeClass returns class for add/remove/context', () => {
    const emit = () => {};
    const { rowTypeClass } = useDiffSideBySide(() => '', () => '', () => '', () => false, () => '', emit);
    expect(rowTypeClass({ type: 'add' })).toBe('diff-row-add');
    expect(rowTypeClass({ type: 'remove' })).toBe('diff-row-remove');
    expect(rowTypeClass({ type: 'context' })).toBe('diff-row-context');
  });

  it('displayTitle uses getTitle when provided', () => {
    const emit = () => {};
    const { displayTitle } = useDiffSideBySide(
      () => '/path',
      () => 'file.js',
      () => '',
      () => false,
      () => 'Custom Title',
      emit
    );
    expect(displayTitle.value).toBe('Custom Title');
  });

  it('canUseOld returns true for add row when no commit sha', () => {
    const emit = () => {};
    const { canUseOld } = useDiffSideBySide(() => '/path', () => 'file.js', () => '', () => false, () => '', emit);
    expect(canUseOld({ type: 'add', newLineNum: 1 })).toBe(true);
  });

  it('canUseNew returns false when row not revertedToOld', () => {
    const emit = () => {};
    const { canUseNew } = useDiffSideBySide(() => '/path', () => 'file.js', () => '', () => false, () => '', emit);
    expect(canUseNew({ type: 'add', revertedToOld: false })).toBe(false);
  });

  it('copyLine calls copyToClipboard when text provided', async () => {
    const emit = () => {};
    const { copyLine } = useDiffSideBySide(() => '/path', () => 'file.js', () => '', () => false, () => '', emit);
    await copyLine('line content');
    expect(globalThis.window.releaseManager.copyToClipboard).toHaveBeenCalledWith('line content');
  });

  it('close emits close', () => {
    const emit = vi.fn();
    const { close } = useDiffSideBySide(() => '', () => '', () => '', () => false, () => '', emit);
    close();
    expect(emit).toHaveBeenCalledWith('close');
  });

  it('displayTitle shows staged when getStaged true', () => {
    const emit = () => {};
    const { displayTitle } = useDiffSideBySide(
      () => '/path',
      () => 'file.js',
      () => '',
      () => true,
      () => '',
      emit
    );
    expect(displayTitle.value).toBe('Diff (staged): file.js');
  });

  it('rows populated when API returns (via watch)', async () => {
    const emit = () => {};
    const api = globalThis.window?.releaseManager;
    api.getFileDiffStructured.mockResolvedValue({
      ok: true,
      rows: [{ type: 'add', newLineNum: 1, newContent: 'line' }],
    });
    const { rows } = useDiffSideBySide(
      () => '/dir',
      () => 'file.js',
      () => '',
      () => false,
      () => '',
      emit
    );
    await new Promise((r) => setTimeout(r, 50));
    expect(rows.value).toHaveLength(1);
    expect(rows.value[0].originalNewContent).toBe('line');
  });

  it('error set when API returns error (via watch)', async () => {
    const emit = () => {};
    const api = globalThis.window?.releaseManager;
    api.getFileDiffStructured.mockResolvedValue({ error: 'Not found' });
    const { error } = useDiffSideBySide(
      () => '/dir',
      () => 'file.js',
      () => '',
      () => false,
      () => '',
      emit
    );
    await new Promise((r) => setTimeout(r, 50));
    expect(error.value).toBe('Not found');
  });

  it('useOld reverts add line via revertFileLine', async () => {
    const emit = vi.fn();
    const api = globalThis.window?.releaseManager;
    api.getFileDiffStructured.mockResolvedValue({
      ok: true,
      rows: [{ type: 'add', newLineNum: 1, newContent: 'new', revertedToOld: false }],
    });
    api.revertFileLine.mockResolvedValue({ ok: true });
    const { useOld, rows } = useDiffSideBySide(
      () => '/dir',
      () => 'file.js',
      () => '',
      () => false,
      () => '',
      emit
    );
    await new Promise((r) => setTimeout(r, 50));
    const row = rows.value[0];
    await useOld(row);
    expect(api.revertFileLine).toHaveBeenCalledWith('/dir', 'file.js', 'delete', 1, null);
    expect(row.revertedToOld).toBe(true);
  });

  it('discardEntireFile calls discardFile when confirmed', async () => {
    window.confirm = vi.fn().mockReturnValue(true);
    const emit = vi.fn();
    globalThis.window.releaseManager.discardFile.mockResolvedValue(undefined);
    const { discardEntireFile } = useDiffSideBySide(
      () => '/dir',
      () => 'file.js',
      () => '',
      () => false,
      () => '',
      emit
    );
    await discardEntireFile();
    expect(globalThis.window.releaseManager.discardFile).toHaveBeenCalledWith('/dir', 'file.js');
    expect(emit).toHaveBeenCalledWith('refresh');
    expect(emit).toHaveBeenCalledWith('close');
  });

  it('useNew reverts add row back to new content', async () => {
    const emit = vi.fn();
    const api = globalThis.window?.releaseManager;
    api.getFileDiffStructured.mockResolvedValue({
      ok: true,
      rows: [{ type: 'add', newLineNum: 1, newContent: 'new line', revertedToOld: false }],
    });
    api.revertFileLine.mockResolvedValue({ ok: true });
    const { useOld, useNew, rows } = useDiffSideBySide(
      () => '/dir',
      () => 'file.js',
      () => '',
      () => false,
      () => '',
      emit
    );
    await new Promise((r) => setTimeout(r, 50));
    const row = rows.value[0];
    await useOld(row);
    expect(row.revertedToOld).toBe(true);
    await useNew(row);
    expect(row.revertedToOld).toBe(false);
    expect(api.revertFileLine).toHaveBeenCalledWith('/dir', 'file.js', 'insert', 1, 'new line');
  });

  it('discardEntireFile does nothing when not confirmed', async () => {
    window.confirm = vi.fn().mockReturnValue(false);
    const emit = vi.fn();
    const { discardEntireFile } = useDiffSideBySide(
      () => '/dir',
      () => 'file.js',
      () => '',
      () => false,
      () => '',
      emit
    );
    await discardEntireFile();
    expect(globalThis.window.releaseManager.discardFile).not.toHaveBeenCalled();
  });
});
