const {
  sendSingleEvent,
  sendBatch,
  track,
  flush,
  getOsString,
} = require('../telemetry');

const TELEMETRY_ENDPOINT = 'https://shipwell-web.test/api/telemetry';

function createMockFetch(capture = {}) {
  return function mockFetch(url, opts) {
    capture.url = url;
    capture.method = opts?.method;
    capture.body = opts?.body != null ? JSON.parse(opts.body) : undefined;
    return Promise.resolve({
      status: 201,
      text: () => Promise.resolve(JSON.stringify({ id: 'test-id', received_at: '2025-01-01T00:00:00Z' })),
    });
  };
}

describe('telemetry', () => {
  describe('getOsString', () => {
    it('returns a string with platform info', () => {
      const s = getOsString();
      expect(typeof s).toBe('string');
      expect(s.length).toBeGreaterThan(0);
    });
  });

  describe('sendSingleEvent', () => {
    it('sends POST with event and common payload when telemetry enabled', async () => {
      const capture = {};
      const getPreference = (key) => (key === 'telemetry' ? true : undefined);
      const res = await sendSingleEvent(getPreference, 'test.event', { foo: 'bar' }, createMockFetch(capture));
      expect(res.ok).toBe(true);
      expect(capture.url).toBe(TELEMETRY_ENDPOINT);
      expect(capture.method).toBe('POST');
      expect(capture.body.event).toBe('test.event');
      expect(capture.body.properties).toEqual({ foo: 'bar' });
      expect(typeof capture.body.app_version).toBe('string');
      expect(typeof capture.body.os).toBe('string');
    });

    it('does not send when telemetry disabled', async () => {
      const capture = {};
      const getPreference = (key) => (key === 'telemetry' ? false : undefined);
      const res = await sendSingleEvent(getPreference, 'test.event', {}, createMockFetch(capture));
      expect(res.ok).toBe(false);
      expect(res.error).toContain('disabled');
      expect(capture.url).toBeUndefined();
    });

    it('includes device_id when getPreference returns telemetryDeviceId', async () => {
      const capture = {};
      const getPreference = (key) => {
        if (key === 'telemetry') return true;
        if (key === 'telemetryDeviceId') return 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
        return undefined;
      };
      await sendSingleEvent(getPreference, 'device.test', null, createMockFetch(capture));
      expect(capture.body.device_id).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
    });

    it('includes user_identifier when preference set', async () => {
      const capture = {};
      const getPreference = (key) => {
        if (key === 'telemetry') return true;
        if (key === 'telemetryUserIdentifier') return ' user@test.com ';
        return undefined;
      };
      await sendSingleEvent(getPreference, 'ident.test', null, createMockFetch(capture));
      expect(capture.body.user_identifier).toBe('user@test.com');
    });

    it('returns ok: false and error on non-201 response', async () => {
      const getPreference = () => true;
      const badFetch = () => Promise.resolve({ status: 500, text: () => Promise.resolve('Server error') });
      const res = await sendSingleEvent(getPreference, 'x', {}, badFetch);
      expect(res.ok).toBe(false);
      expect(res.error).toBeDefined();
    });
  });

  describe('track and flush', () => {
    it('queues event and flush sends batch to endpoint', async () => {
      const capture = {};
      const getPreference = (key) => (key === 'telemetry' ? true : undefined);
      track(getPreference, 'view.viewed', { view: 'dashboard' });
      track(getPreference, 'detail_tab.viewed', { tab: 'git' });
      const flushRes = await flush(getPreference, createMockFetch(capture));
      expect(flushRes.ok).toBe(true);
      expect(capture.url).toBe(TELEMETRY_ENDPOINT);
      expect(capture.method).toBe('POST');
      expect(Array.isArray(capture.body.events)).toBe(true);
      expect(capture.body.events.length).toBe(2);
      expect(capture.body.events[0].event).toBe('view.viewed');
      expect(capture.body.events[0].properties).toEqual({ view: 'dashboard' });
      expect(capture.body.events[1].event).toBe('detail_tab.viewed');
      expect(capture.body.events[1].properties).toEqual({ tab: 'git' });
      expect(typeof capture.body.app_version).toBe('string');
      expect(typeof capture.body.os).toBe('string');
    });

    it('track does nothing when telemetry disabled', async () => {
      const capture = {};
      const getPreference = (key) => (key === 'telemetry' ? false : undefined);
      track(getPreference, 'no.send', {});
      const flushRes = await flush(getPreference, createMockFetch(capture));
      expect(flushRes.ok).toBe(true);
      expect(flushRes.accepted_count).toBe(0);
      expect(capture.body).toBeUndefined();
    });
  });

  describe('sendBatch', () => {
    it('sends multiple events in one body', async () => {
      const capture = {};
      const getPreference = (key) => (key === 'telemetry' ? true : undefined);
      const events = [
        { event: 'app.opened', properties: { source: 'launch' } },
        { event: 'feature.export_used', properties: { format: 'json' } },
      ];
      const res = await sendBatch(getPreference, events, createMockFetch(capture));
      expect(res.ok).toBe(true);
      expect(capture.body.events.length).toBe(2);
      expect(capture.body.events[0].event).toBe('app.opened');
      expect(capture.body.events[1].event).toBe('feature.export_used');
    });
  });
});
