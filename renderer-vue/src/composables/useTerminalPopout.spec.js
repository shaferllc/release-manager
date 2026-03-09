import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useTerminalPopout } from './useTerminalPopout';

describe('useTerminalPopout', () => {
  const originalReleaseManager = globalThis.window?.releaseManager;

  beforeEach(() => {
    if (globalThis.window) {
      globalThis.window.releaseManager = {
        getTerminalPopoutState: vi.fn(),
        closeTerminalPopoutWindow: vi.fn(),
      };
    }
  });

  afterEach(() => {
    if (globalThis.window) {
      globalThis.window.releaseManager = originalReleaseManager;
    }
  });

  it('returns dirPath, displayPath, closeWindow', () => {
    const result = useTerminalPopout();
    expect(result).toHaveProperty('dirPath');
    expect(result).toHaveProperty('displayPath');
    expect(result).toHaveProperty('closeWindow');
  });

  it('displayPath is computed from dirPath', () => {
    const { dirPath, displayPath } = useTerminalPopout();
    dirPath.value = '/short';
    expect(displayPath.value).toBe('/short');
  });

  it('closeWindow calls closeTerminalPopoutWindow when available', () => {
    const api = globalThis.window?.releaseManager;
    const { closeWindow } = useTerminalPopout();
    closeWindow();
    expect(api.closeTerminalPopoutWindow).toHaveBeenCalled();
  });
});
