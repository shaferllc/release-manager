import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setEnabled, log, warn } from './debug';

describe('debug', () => {
  let logSpy;
  let warnSpy;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('setEnabled sets window.__rmDebug', () => {
    setEnabled(true);
    expect(window.__rmDebug).toBe(true);
    setEnabled(false);
    expect(window.__rmDebug).toBe(false);
  });

  it('log calls console when enabled', () => {
    setEnabled(true);
    log('test', 'action');
    expect(logSpy).toHaveBeenCalledWith('[RM Debug] [renderer]', '[test]', 'action');
  });

  it('log with detail passes extra args', () => {
    setEnabled(true);
    log('cat', 'action', { foo: 1 });
    expect(logSpy).toHaveBeenCalledWith('[RM Debug] [renderer]', '[cat]', 'action', { foo: 1 });
  });

  it('warn calls console.warn when enabled', () => {
    setEnabled(true);
    warn('warn', 'msg');
    expect(warnSpy).toHaveBeenCalled();
  });

  it('log does not call console when disabled', () => {
    setEnabled(false);
    log('test', 'action');
    expect(logSpy).not.toHaveBeenCalled();
  });
});
