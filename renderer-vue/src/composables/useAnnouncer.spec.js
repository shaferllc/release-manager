import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useAnnouncer } from './useAnnouncer';

describe('useAnnouncer', () => {
  beforeEach(() => {
    document.documentElement.setAttribute('data-screen-reader-support', 'true');
    const { message } = useAnnouncer();
    message.value = '';
  });

  afterEach(() => {
    document.documentElement.removeAttribute('data-screen-reader-support');
    vi.useRealTimers();
  });

  it('returns message, politeness, announce, announcePolite, announceAssertive', () => {
    const announcer = useAnnouncer();
    expect(announcer.message).toBeDefined();
    expect(announcer.politeness).toBeDefined();
    expect(typeof announcer.announce).toBe('function');
    expect(typeof announcer.announcePolite).toBe('function');
    expect(typeof announcer.announceAssertive).toBe('function');
  });

  it('announce sets message when screen reader support enabled', () => {
    vi.useFakeTimers();
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb();
      return 1;
    });
    const { announce, message } = useAnnouncer();
    announce('Hello');
    expect(message.value).toBe('Hello');
    rafSpy.mockRestore();
  });

  it('announce does nothing when screen reader support disabled', () => {
    document.documentElement.removeAttribute('data-screen-reader-support');
    const { announce, message } = useAnnouncer();
    message.value = '';
    announce('Hello');
    expect(message.value).toBe('');
  });

  it('announce does nothing for empty text', () => {
    const { announce, message } = useAnnouncer();
    announce('');
    announce(null);
    expect(message.value).toBe('');
  });

  it('announcePolite calls announce with polite', () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb();
      return 1;
    });
    const { announcePolite, politeness } = useAnnouncer();
    announcePolite('Test');
    expect(politeness.value).toBe('polite');
  });

  it('announceAssertive calls announce with assertive', () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb();
      return 1;
    });
    const { announceAssertive, politeness } = useAnnouncer();
    announceAssertive('Alert');
    expect(politeness.value).toBe('assertive');
  });

  it('announce clears message after timeout', () => {
    vi.useFakeTimers();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb();
      return 1;
    });
    const { announce, message } = useAnnouncer();
    announce('Temp');
    expect(message.value).toBe('Temp');
    vi.advanceTimersByTime(8000);
    expect(message.value).toBe('');
  });
});
