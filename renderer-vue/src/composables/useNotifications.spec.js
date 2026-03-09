import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useNotifications } from './useNotifications';

describe('useNotifications', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    if (globalThis.window?.releaseManager) {
      globalThis.window.releaseManager.showSystemNotification = vi.fn().mockResolvedValue(undefined);
    }
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns toasts, add, and remove', () => {
    const { toasts, add, remove } = useNotifications();
    expect(toasts).toBeDefined();
    expect(typeof add).toBe('function');
    expect(typeof remove).toBe('function');
  });

  it('add creates a toast with default title and type', () => {
    const { add, toasts } = useNotifications();
    const id = add({});
    const last = toasts.value.at(-1);
    expect(last.title).toBe('Notification');
    expect(last.type).toBe('info');
    expect(last.id).toBe(id);
  });

  it('add uses custom title, message, and type', () => {
    const { add, toasts } = useNotifications();
    add({ title: 'Success', message: 'Done!', type: 'success' });
    const last = toasts.value.at(-1);
    expect(last.title).toBe('Success');
    expect(last.message).toBe('Done!');
    expect(last.type).toBe('success');
  });

  it('add accepts body as alias for message', () => {
    const { add, toasts } = useNotifications();
    add({ title: 'Hi', body: 'Hello world' });
    const last = toasts.value.at(-1);
    expect(last.message).toBe('Hello world');
  });

  it('remove removes toast by id', () => {
    const { add, remove, toasts } = useNotifications();
    const idA = add({ title: 'ToastA' });
    add({ title: 'ToastB' });
    remove(idA);
    expect(toasts.value.find((t) => t.id === idA)).toBeUndefined();
    expect(toasts.value.some((t) => t.title === 'ToastB')).toBe(true);
  });

  it('add with duration > 0 auto-removes after timeout', () => {
    const { add, toasts } = useNotifications();
    const id = add({ title: 'Temp', duration: 5000 });
    expect(toasts.value.some((t) => t.id === id)).toBe(true);
    vi.advanceTimersByTime(5000);
    expect(toasts.value.find((t) => t.id === id)).toBeUndefined();
  });

  it('add with duration 0 does not auto-remove', () => {
    const { add, toasts } = useNotifications();
    const id = add({ title: 'Persistent', duration: 0 });
    vi.advanceTimersByTime(10000);
    expect(toasts.value.find((t) => t.id === id)).toBeTruthy();
  });

  it('add calls showSystemNotification when available', () => {
    const showSystemNotification = vi.fn().mockResolvedValue(undefined);
    if (globalThis.window?.releaseManager) {
      globalThis.window.releaseManager.showSystemNotification = showSystemNotification;
    }
    const { add } = useNotifications();
    add({ title: 'Alert', message: 'Check this' });
    expect(showSystemNotification).toHaveBeenCalledWith('Alert', 'Check this');
  });
});
