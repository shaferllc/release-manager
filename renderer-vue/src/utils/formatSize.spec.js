import { describe, it, expect } from 'vitest';
import { formatSize } from './formatSize';

describe('formatSize', () => {
  it('returns empty string for null or undefined', () => {
    expect(formatSize(null)).toBe('');
    expect(formatSize(undefined)).toBe('');
  });

  it('formats bytes under 1024 as B', () => {
    expect(formatSize(0)).toBe('0 B');
    expect(formatSize(500)).toBe('500 B');
    expect(formatSize(1023)).toBe('1023 B');
  });

  it('formats bytes >= 1024 as KB', () => {
    expect(formatSize(1024)).toBe('1.0 KB');
    expect(formatSize(1536)).toBe('1.5 KB');
    expect(formatSize(1024 * 1024 - 1)).toBe('1024.0 KB');
  });

  it('formats bytes >= 1024*1024 as MB', () => {
    expect(formatSize(1024 * 1024)).toBe('1.0 MB');
    expect(formatSize(2.5 * 1024 * 1024)).toBe('2.5 MB');
  });
});
