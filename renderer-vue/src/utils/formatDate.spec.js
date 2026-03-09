import { describe, it, expect } from 'vitest';
import { formatDate, formatDateShort, formatDateWithTime, formatDateTimeShort } from './formatDate';

describe('formatDate', () => {
  it('returns — for null or undefined', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate(undefined)).toBe('—');
  });

  it('returns — for empty string', () => {
    expect(formatDate('')).toBe('—');
  });

  it('formats date-only ISO string', () => {
    const result = formatDate('2025-03-09');
    expect(result).toMatch(/Mar.*2025/);
    expect(result).not.toBe('—');
  });

  it('formats datetime ISO string with time', () => {
    const result = formatDate('2025-03-09T14:30:00Z');
    expect(result).toMatch(/Mar|March/);
    expect(result).toMatch(/\d/);
  });

  it('returns invalid date string as-is', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date');
  });
});

describe('formatDateShort', () => {
  it('returns empty string for null or undefined', () => {
    expect(formatDateShort(null)).toBe('');
    expect(formatDateShort(undefined)).toBe('');
  });

  it('formats to short date', () => {
    const result = formatDateShort('2025-03-09');
    expect(result).toMatch(/Mar|3/);
  });

  it('returns invalid date string as-is', () => {
    expect(formatDateShort('invalid')).toBe('invalid');
  });
});

describe('formatDateWithTime', () => {
  it('returns — for null or undefined', () => {
    expect(formatDateWithTime(null)).toBe('—');
    expect(formatDateWithTime(undefined)).toBe('—');
  });

  it('returns time only when same day as now', () => {
    const now = new Date();
    const iso = now.toISOString();
    const result = formatDateWithTime(iso);
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });

  it('returns date and time when different day', () => {
    const result = formatDateWithTime('2020-01-15T10:30:00Z');
    expect(result).toMatch(/Jan|10|30/);
  });
});

describe('formatDateTimeShort', () => {
  it('returns empty string for null or undefined', () => {
    expect(formatDateTimeShort(null)).toBe('');
    expect(formatDateTimeShort(undefined)).toBe('');
  });

  it('formats valid date', () => {
    const result = formatDateTimeShort('2025-03-09T14:30:00');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns invalid date string as-is', () => {
    expect(formatDateTimeShort('bad')).toBe('bad');
  });

  it('returns isoDate when toLocaleString throws', () => {
    const orig = Date.prototype.toLocaleString;
    Date.prototype.toLocaleString = function () {
      throw new Error('locale error');
    };
    try {
      expect(formatDateTimeShort('2025-03-09T14:30:00')).toBe('2025-03-09T14:30:00');
    } finally {
      Date.prototype.toLocaleString = orig;
    }
  });
});
