import { describe, it, expect } from 'vitest';
import {
  MESSAGE_TYPES,
  TYPE_TAB_LABELS,
  isPayloadEnvelope,
  normalizePayloadToMessage,
  formatPayload,
  getSearchableText,
} from './messageUtils';

describe('messageUtils', () => {
  describe('MESSAGE_TYPES', () => {
    it('includes expected types', () => {
      expect(MESSAGE_TYPES).toContain('dump');
      expect(MESSAGE_TYPES).toContain('trace');
      expect(MESSAGE_TYPES).toContain('log');
    });
  });

  describe('TYPE_TAB_LABELS', () => {
    it('has labels for types', () => {
      expect(TYPE_TAB_LABELS.dump).toBe('Dump');
      expect(TYPE_TAB_LABELS.all).toBe('All');
    });
  });

  describe('isPayloadEnvelope', () => {
    it('returns false for null or undefined', () => {
      expect(isPayloadEnvelope(null)).toBe(false);
      expect(isPayloadEnvelope(undefined)).toBe(false);
    });

    it('returns false when payloads is empty or missing', () => {
      expect(isPayloadEnvelope({})).toBe(false);
      expect(isPayloadEnvelope({ payloads: [] })).toBe(false);
    });

    it('returns true when payloads has valid envelope structure', () => {
      const msg = {
        payloads: [
          { type: 'log', content: 'x', origin: {} },
        ],
      };
      expect(isPayloadEnvelope(msg)).toBe(true);
    });

    it('returns false when first payload lacks type or content', () => {
      expect(isPayloadEnvelope({ payloads: [{ content: 'x' }] })).toBe(false);
      expect(isPayloadEnvelope({ payloads: [{ type: 'log' }] })).toBe(false);
    });
  });

  describe('normalizePayloadToMessage', () => {
    it('normalizes custom type with HTML label to html', () => {
      const p = { type: 'custom', content: { label: 'HTML', content: '<p>hi</p>' }, origin: {} };
      const result = normalizePayloadToMessage(p);
      expect(result.type).toBe('html');
      expect(result.payload.content).toBe('<p>hi</p>');
    });

    it('normalizes log type', () => {
      const p = { type: 'log', content: { level: 'error', message: 'oops' }, origin: {} };
      const result = normalizePayloadToMessage(p);
      expect(result.type).toBe('log');
      expect(result.payload.level).toBe('error');
      expect(result.payload.message).toBe('oops');
    });

    it('normalizes query type with sql', () => {
      const p = { type: 'query', content: { sql: 'SELECT 1' }, origin: {} };
      const result = normalizePayloadToMessage(p);
      expect(result.payload.sql).toBe('SELECT 1');
    });

    it('normalizes table type', () => {
      const p = { type: 'table', content: { data: [[1, 2]] }, origin: {} };
      const result = normalizePayloadToMessage(p);
      expect(result.type).toBe('table');
      expect(result.payload.data).toEqual([[1, 2]]);
    });

    it('normalizes phpinfo type', () => {
      const p = { type: 'phpinfo', content: { html: '<table>...</table>' }, origin: {} };
      const result = normalizePayloadToMessage(p);
      expect(result.payload.content).toBe('<table>...</table>');
    });

    it('uses envelopeMeta for time and label', () => {
      const p = { type: 'custom', content: {}, origin: {} };
      const meta = { time: '2024-01-01T00:00:00Z', label: 'Test' };
      const result = normalizePayloadToMessage(p, meta);
      expect(result.meta.time).toBe('2024-01-01T00:00:00Z');
      expect(result.meta.label).toBe('Test');
    });
  });

  describe('formatPayload', () => {
    it('returns empty string for null or missing payload', () => {
      expect(formatPayload(null)).toBe('');
      expect(formatPayload({})).toBe('');
    });

    it('formats log type', () => {
      const msg = { type: 'log', payload: { level: 'error', message: 'oops' } };
      expect(formatPayload(msg)).toContain('ERROR');
      expect(formatPayload(msg)).toContain('oops');
    });

    it('formats query type', () => {
      const msg = { type: 'query', payload: { sql: 'SELECT 1' } };
      expect(formatPayload(msg)).toBe('SELECT 1');
    });

    it('formats markdown type', () => {
      const msg = { type: 'markdown', payload: { content: '# Hello' } };
      expect(formatPayload(msg)).toBe('# Hello');
    });

    it('formats label type', () => {
      const msg = { type: 'label', payload: { label: 'My Label' } };
      expect(formatPayload(msg)).toBe('My Label');
    });

    it('formats benchmark type', () => {
      const msg = { type: 'benchmark', payload: { name: 'foo', duration: 42 } };
      expect(formatPayload(msg)).toContain('foo');
      expect(formatPayload(msg)).toContain('42');
    });

    it('formats table type', () => {
      const msg = { type: 'table', payload: { data: [{ a: 1 }, { b: 2 }] } };
      expect(formatPayload(msg)).toContain('a');
      expect(formatPayload(msg)).toContain('1');
    });

    it('formats time_track with duration', () => {
      const msg = { type: 'time_track', payload: { name: 'query', duration: null } };
      expect(formatPayload(msg)).toContain('query');
      expect(formatPayload(msg)).toContain('start');
    });

    it('formats time_track with duration value', () => {
      const msg = { type: 'time_track', payload: { name: 'query', duration: 150 } };
      expect(formatPayload(msg)).toContain('query');
      expect(formatPayload(msg)).toContain('150');
    });

    it('formats screen type', () => {
      const msg = { type: 'screen', payload: { screen_name: 'Dashboard' } };
      expect(formatPayload(msg)).toContain('Dashboard');
    });

    it('falls back to JSON for unknown types', () => {
      const msg = { type: 'unknown', payload: { foo: 'bar' } };
      expect(formatPayload(msg)).toContain('foo');
      expect(formatPayload(msg)).toContain('bar');
    });
  });

  describe('getSearchableText', () => {
    it('returns lowercase concatenation of type, meta, and payload', () => {
      const msg = {
        type: 'log',
        meta: { file: 'foo.php', line: 10, label: 'Test' },
        payload: { message: 'Hello' },
      };
      const text = getSearchableText(msg);
      expect(text).toContain('log');
      expect(text).toContain('foo.php');
      expect(text).toContain('10');
      expect(text).toContain('hello');
    });

    it('handles missing meta', () => {
      const msg = { type: 'log', payload: { message: 'x' } };
      expect(getSearchableText(msg)).toBeTruthy();
    });
  });
});
