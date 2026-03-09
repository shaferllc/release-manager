import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useResizableSidebar } from './useResizableSidebar';

describe('useResizableSidebar', () => {
  const originalReleaseManager = globalThis.window?.releaseManager;

  beforeEach(() => {
    if (globalThis.window) {
      globalThis.window.releaseManager = {
        getPreference: vi.fn(),
        setPreference: vi.fn(),
      };
    }
  });

  afterEach(() => {
    if (globalThis.window) {
      globalThis.window.releaseManager = originalReleaseManager;
    }
  });

  it('returns sidebarWidth, sidebarStyle, onResizerPointerDown', () => {
    const result = useResizableSidebar({
      preferenceKey: 'test',
      defaultWidth: 200,
    });
    expect(result).toHaveProperty('sidebarWidth');
    expect(result).toHaveProperty('sidebarStyle');
    expect(result).toHaveProperty('onResizerPointerDown');
  });

  it('sidebarWidth starts at defaultWidth', () => {
    const { sidebarWidth } = useResizableSidebar({
      preferenceKey: 'test',
      defaultWidth: 250,
    });
    expect(sidebarWidth.value).toBe(250);
  });

  it('sidebarStyle includes width, minWidth, maxWidth', () => {
    const { sidebarStyle } = useResizableSidebar({
      preferenceKey: 'test',
      defaultWidth: 200,
      minWidth: 100,
      maxWidth: 400,
    });
    expect(sidebarStyle.value.width).toBe('200px');
    expect(sidebarStyle.value.minWidth).toBe('100px');
    expect(sidebarStyle.value.maxWidth).toBe('400px');
  });

  it('onResizerPointerDown ignores non-left click', () => {
    const { sidebarWidth, onResizerPointerDown } = useResizableSidebar({
      preferenceKey: 'test',
      defaultWidth: 200,
    });
    const e = { button: 1, clientX: 300, preventDefault: vi.fn() };
    onResizerPointerDown(e);
    expect(sidebarWidth.value).toBe(200);
  });

  it('onResizerPointerDown with left click adds listeners and saveWidth on pointerup', () => {
    const { sidebarWidth, onResizerPointerDown } = useResizableSidebar({
      preferenceKey: 'test',
      defaultWidth: 200,
    });
    const e = { button: 0, clientX: 100, preventDefault: vi.fn() };
    onResizerPointerDown(e);
    const moveEv = new MouseEvent('pointermove', { clientX: 150 });
    document.dispatchEvent(moveEv);
    expect(sidebarWidth.value).toBe(250);
    document.dispatchEvent(new Event('pointerup'));
    expect(globalThis.window.releaseManager.setPreference).toHaveBeenCalledWith('test', 250);
  });

  it('rightSide subtracts delta on move', () => {
    const { sidebarWidth, onResizerPointerDown } = useResizableSidebar({
      preferenceKey: 'test',
      defaultWidth: 300,
      rightSide: true,
    });
    const e = { button: 0, clientX: 100, preventDefault: vi.fn() };
    onResizerPointerDown(e);
    const moveEv = new MouseEvent('pointermove', { clientX: 150 });
    document.dispatchEvent(moveEv);
    expect(sidebarWidth.value).toBe(250);
    document.dispatchEvent(new Event('pointerup'));
  });
});
