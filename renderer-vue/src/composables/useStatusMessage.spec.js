import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useStatusMessage } from './useStatusMessage';

describe('useStatusMessage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns status, clear, setSuccess, setError, setExported', () => {
    const { status, clear, setSuccess, setError, setExported } = useStatusMessage(1000);
    expect(status.value).toBe('');
    expect(typeof clear).toBe('function');
    expect(typeof setSuccess).toBe('function');
    expect(typeof setError).toBe('function');
    expect(typeof setExported).toBe('function');
  });

  it('setSuccess sets status to Copied!', () => {
    const { status, setSuccess } = useStatusMessage(1000);
    setSuccess();
    expect(status.value).toBe('Copied!');
  });

  it('setError sets status to Failed', () => {
    const { status, setError } = useStatusMessage(1000);
    setError();
    expect(status.value).toBe('Failed');
  });

  it('setExported sets status to Exported!', () => {
    const { status, setExported } = useStatusMessage(1000);
    setExported();
    expect(status.value).toBe('Exported!');
  });

  it('clear resets status immediately', () => {
    const { status, setSuccess, clear } = useStatusMessage(1000);
    setSuccess();
    expect(status.value).toBe('Copied!');
    clear();
    expect(status.value).toBe('');
  });

  it('auto-clears after resetMs', () => {
    const { status, setSuccess } = useStatusMessage(1000);
    setSuccess();
    expect(status.value).toBe('Copied!');
    vi.advanceTimersByTime(1000);
    expect(status.value).toBe('');
  });
});
