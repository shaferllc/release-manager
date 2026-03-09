const {
  setBaseUrlProvider,
  sendSingleEvent,
  sendBatch,
  track,
  flush,
  getOsString,
} = require('../telemetry');

const TEST_BASE_URL = 'https://shipwell-web.test';
const TELEMETRY_ENDPOINT = TEST_BASE_URL + '/api/telemetry';

beforeAll(() => {
  setBaseUrlProvider(() => TEST_BASE_URL);
});

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

  describe('new usage tracking events', () => {
    it('tracks git operations via queue and batch flush', async () => {
      const capture = {};
      const getPreference = (key) => (key === 'telemetry' ? true : undefined);
      track(getPreference, 'git.commit', {});
      track(getPreference, 'git.push', {});
      track(getPreference, 'git.pull', {});
      track(getPreference, 'git.fetch', {});
      track(getPreference, 'git.merge', {});
      track(getPreference, 'git.create_branch', {});
      track(getPreference, 'git.checkout_branch', {});
      track(getPreference, 'git.stash_push', {});
      track(getPreference, 'git.stash_pop', {});
      track(getPreference, 'git.discard_changes', {});
      track(getPreference, 'git.tag_and_push', {});
      const res = await flush(getPreference, createMockFetch(capture));
      expect(res.ok).toBe(true);
      expect(capture.body.events.length).toBe(11);
      const eventNames = capture.body.events.map((e) => e.event);
      expect(eventNames).toContain('git.commit');
      expect(eventNames).toContain('git.push');
      expect(eventNames).toContain('git.pull');
      expect(eventNames).toContain('git.merge');
      expect(eventNames).toContain('git.create_branch');
      expect(eventNames).toContain('git.stash_push');
      expect(eventNames).toContain('git.tag_and_push');
    });

    it('tracks release operations', async () => {
      const capture = {};
      const getPreference = (key) => (key === 'telemetry' ? true : undefined);
      track(getPreference, 'release.created', { bump: 'patch', force: false });
      track(getPreference, 'release.version_bump', { bump: 'minor' });
      track(getPreference, 'release.download_latest', {});
      track(getPreference, 'release.batch', { count: 3, bump: 'patch' });
      const res = await flush(getPreference, createMockFetch(capture));
      expect(res.ok).toBe(true);
      expect(capture.body.events.length).toBe(4);
      expect(capture.body.events[0].event).toBe('release.created');
      expect(capture.body.events[0].properties.bump).toBe('patch');
      expect(capture.body.events[3].event).toBe('release.batch');
      expect(capture.body.events[3].properties.count).toBe(3);
    });

    it('tracks project operations', async () => {
      const capture = {};
      const getPreference = (key) => (key === 'telemetry' ? true : undefined);
      track(getPreference, 'project.added', { total: 5 });
      track(getPreference, 'project.removed', { total: 4 });
      track(getPreference, 'project.selected', { type: 'npm' });
      const res = await flush(getPreference, createMockFetch(capture));
      expect(res.ok).toBe(true);
      expect(capture.body.events.length).toBe(3);
      expect(capture.body.events[0].properties.total).toBe(5);
      expect(capture.body.events[2].properties.type).toBe('npm');
    });

    it('tracks extension operations', async () => {
      const capture = {};
      const getPreference = (key) => (key === 'telemetry' ? true : undefined);
      track(getPreference, 'extension.installed', { extension_id: 'kanban' });
      track(getPreference, 'extension.uninstalled', { extension_id: 'kanban' });
      track(getPreference, 'extension.uploaded', {});
      const res = await flush(getPreference, createMockFetch(capture));
      expect(res.ok).toBe(true);
      expect(capture.body.events.length).toBe(3);
      expect(capture.body.events[0].properties.extension_id).toBe('kanban');
    });

    it('tracks AI generation events', async () => {
      const capture = {};
      const getPreference = (key) => (key === 'telemetry' ? true : undefined);
      track(getPreference, 'ai.generate', { feature: 'commit_message' });
      track(getPreference, 'ai.generate', { feature: 'release_notes' });
      track(getPreference, 'ai.generate', { feature: 'tag_message' });
      track(getPreference, 'ai.generate', { feature: 'test_fix' });
      track(getPreference, 'ai.generate', { feature: 'generate_tests' });
      const res = await flush(getPreference, createMockFetch(capture));
      expect(res.ok).toBe(true);
      expect(capture.body.events.length).toBe(5);
      const features = capture.body.events.map((e) => e.properties.feature);
      expect(features).toEqual(['commit_message', 'release_notes', 'tag_message', 'test_fix', 'generate_tests']);
    });

    it('tracks GitHub PR operations', async () => {
      const capture = {};
      const getPreference = (key) => (key === 'telemetry' ? true : undefined);
      track(getPreference, 'github.create_pull_request', {});
      track(getPreference, 'github.merge_pull_request', { merge_method: 'squash' });
      const res = await flush(getPreference, createMockFetch(capture));
      expect(res.ok).toBe(true);
      expect(capture.body.events.length).toBe(2);
      expect(capture.body.events[1].properties.merge_method).toBe('squash');
    });

    it('tracks auth events', async () => {
      const capture = {};
      const getPreference = (key) => (key === 'telemetry' ? true : undefined);
      track(getPreference, 'user.login', { method: 'password' });
      track(getPreference, 'user.register', {});
      track(getPreference, 'user.logout', {});
      track(getPreference, 'user.password_reset_requested', {});
      const res = await flush(getPreference, createMockFetch(capture));
      expect(res.ok).toBe(true);
      expect(capture.body.events.length).toBe(4);
      expect(capture.body.events[0].event).toBe('user.login');
      expect(capture.body.events[0].properties.method).toBe('password');
    });

    it('tracks settings changes', async () => {
      const capture = {};
      const getPreference = (key) => (key === 'telemetry' ? true : undefined);
      track(getPreference, 'settings.theme_changed', { theme: 'dark' });
      track(getPreference, 'settings.reset', {});
      track(getPreference, 'settings.zoom_changed', { factor: 1.25 });
      track(getPreference, 'settings.launch_at_login', { enabled: true });
      track(getPreference, 'settings.ai_provider_changed', { provider: 'openai' });
      const res = await flush(getPreference, createMockFetch(capture));
      expect(res.ok).toBe(true);
      expect(capture.body.events.length).toBe(5);
      expect(capture.body.events[0].properties.theme).toBe('dark');
      expect(capture.body.events[4].properties.provider).toBe('openai');
    });

    it('tracks app lifecycle events', async () => {
      const capture = {};
      const getPreference = (key) => (key === 'telemetry' ? true : undefined);
      track(getPreference, 'app.opened', { source: 'launch' });
      track(getPreference, 'app.closed', {});
      track(getPreference, 'view.viewed', { view: 'dashboard' });
      track(getPreference, 'detail_tab.viewed', { tab: 'git' });
      track(getPreference, 'command_palette.opened', {});
      track(getPreference, 'command_palette.run', { command: 'app.add_project' });
      const res = await flush(getPreference, createMockFetch(capture));
      expect(res.ok).toBe(true);
      expect(capture.body.events.length).toBe(6);
      const names = capture.body.events.map((e) => e.event);
      expect(names).toContain('app.opened');
      expect(names).toContain('app.closed');
      expect(names).toContain('command_palette.run');
    });

    it('tracks test execution', async () => {
      const capture = {};
      const getPreference = (key) => (key === 'telemetry' ? true : undefined);
      track(getPreference, 'tests.run', { project_type: 'npm' });
      track(getPreference, 'tests.coverage', { project_type: 'composer' });
      const res = await flush(getPreference, createMockFetch(capture));
      expect(res.ok).toBe(true);
      expect(capture.body.events.length).toBe(2);
      expect(capture.body.events[0].properties.project_type).toBe('npm');
    });

    it('tracks advanced git operations (rebase, cherry-pick, bisect, etc.)', async () => {
      const capture = {};
      const getPreference = (key) => (key === 'telemetry' ? true : undefined);
      track(getPreference, 'git.rebase', {});
      track(getPreference, 'git.rebase_abort', {});
      track(getPreference, 'git.rebase_continue', {});
      track(getPreference, 'git.rebase_skip', {});
      track(getPreference, 'git.rebase_interactive', {});
      track(getPreference, 'git.cherry_pick', {});
      track(getPreference, 'git.cherry_pick_abort', {});
      track(getPreference, 'git.cherry_pick_continue', {});
      track(getPreference, 'git.revert', {});
      track(getPreference, 'git.amend', {});
      track(getPreference, 'git.reset', { mode: 'hard' });
      track(getPreference, 'git.merge_continue', {});
      const res = await flush(getPreference, createMockFetch(capture));
      expect(res.ok).toBe(true);
      expect(capture.body.events.length).toBe(12);
      const names = capture.body.events.map((e) => e.event);
      expect(names).toContain('git.rebase');
      expect(names).toContain('git.cherry_pick');
      expect(names).toContain('git.revert');
      expect(names).toContain('git.amend');
      expect(names).toContain('git.reset');
      expect(capture.body.events[10].properties.mode).toBe('hard');
    });

    it('tracks branch management events', async () => {
      const capture = {};
      const getPreference = (key) => (key === 'telemetry' ? true : undefined);
      track(getPreference, 'git.delete_branch', { force: true });
      track(getPreference, 'git.delete_remote_branch', {});
      track(getPreference, 'git.rename_branch', {});
      track(getPreference, 'git.checkout_remote_branch', {});
      track(getPreference, 'git.checkout_tag', {});
      track(getPreference, 'git.checkout_ref', {});
      const res = await flush(getPreference, createMockFetch(capture));
      expect(res.ok).toBe(true);
      expect(capture.body.events.length).toBe(6);
      expect(capture.body.events[0].properties.force).toBe(true);
    });

    it('tracks tag operations', async () => {
      const capture = {};
      const getPreference = (key) => (key === 'telemetry' ? true : undefined);
      track(getPreference, 'git.create_tag', {});
      track(getPreference, 'git.delete_tag', {});
      track(getPreference, 'git.push_tag', {});
      const res = await flush(getPreference, createMockFetch(capture));
      expect(res.ok).toBe(true);
      expect(capture.body.events.length).toBe(3);
    });

    it('tracks remote management events', async () => {
      const capture = {};
      const getPreference = (key) => (key === 'telemetry' ? true : undefined);
      track(getPreference, 'git.add_remote', {});
      track(getPreference, 'git.remove_remote', {});
      track(getPreference, 'git.rename_remote', {});
      track(getPreference, 'git.prune_remotes', {});
      track(getPreference, 'git.fetch_remote', {});
      const res = await flush(getPreference, createMockFetch(capture));
      expect(res.ok).toBe(true);
      expect(capture.body.events.length).toBe(5);
    });

    it('tracks stash management events', async () => {
      const capture = {};
      const getPreference = (key) => (key === 'telemetry' ? true : undefined);
      track(getPreference, 'git.stash_apply', {});
      track(getPreference, 'git.stash_drop', {});
      const res = await flush(getPreference, createMockFetch(capture));
      expect(res.ok).toBe(true);
      expect(capture.body.events.length).toBe(2);
    });

    it('tracks file staging events', async () => {
      const capture = {};
      const getPreference = (key) => (key === 'telemetry' ? true : undefined);
      track(getPreference, 'git.stage_file', {});
      track(getPreference, 'git.unstage_file', {});
      track(getPreference, 'git.discard_file', {});
      const res = await flush(getPreference, createMockFetch(capture));
      expect(res.ok).toBe(true);
      expect(capture.body.events.length).toBe(3);
    });

    it('tracks pull variants', async () => {
      const capture = {};
      const getPreference = (key) => (key === 'telemetry' ? true : undefined);
      track(getPreference, 'git.pull_rebase', {});
      track(getPreference, 'git.pull_ff_only', {});
      const res = await flush(getPreference, createMockFetch(capture));
      expect(res.ok).toBe(true);
      expect(capture.body.events.length).toBe(2);
    });

    it('tracks submodule and worktree events', async () => {
      const capture = {};
      const getPreference = (key) => (key === 'telemetry' ? true : undefined);
      track(getPreference, 'git.submodule_update', { init: true });
      track(getPreference, 'git.worktree_add', {});
      track(getPreference, 'git.worktree_remove', {});
      track(getPreference, 'git.init', {});
      const res = await flush(getPreference, createMockFetch(capture));
      expect(res.ok).toBe(true);
      expect(capture.body.events.length).toBe(4);
      expect(capture.body.events[0].properties.init).toBe(true);
    });

    it('tracks bisect events', async () => {
      const capture = {};
      const getPreference = (key) => (key === 'telemetry' ? true : undefined);
      track(getPreference, 'git.bisect_start', {});
      track(getPreference, 'git.bisect_good', {});
      track(getPreference, 'git.bisect_bad', {});
      track(getPreference, 'git.bisect_skip', {});
      track(getPreference, 'git.bisect_reset', {});
      track(getPreference, 'git.bisect_run', {});
      const res = await flush(getPreference, createMockFetch(capture));
      expect(res.ok).toBe(true);
      expect(capture.body.events.length).toBe(6);
    });

    it('tracks feature utility events', async () => {
      const capture = {};
      const getPreference = (key) => (key === 'telemetry' ? true : undefined);
      track(getPreference, 'feature.copy_to_clipboard', {});
      track(getPreference, 'feature.open_in_finder', {});
      track(getPreference, 'feature.open_in_terminal', {});
      track(getPreference, 'feature.open_in_editor', {});
      track(getPreference, 'feature.open_file_in_editor', {});
      const res = await flush(getPreference, createMockFetch(capture));
      expect(res.ok).toBe(true);
      expect(capture.body.events.length).toBe(5);
      const names = capture.body.events.map((e) => e.event);
      expect(names).toContain('feature.copy_to_clipboard');
      expect(names).toContain('feature.open_in_editor');
    });

    it('tracks team events', async () => {
      const capture = {};
      const getPreference = (key) => (key === 'telemetry' ? true : undefined);
      track(getPreference, 'team.created', {});
      track(getPreference, 'team.member_invited', {});
      track(getPreference, 'team.member_removed', {});
      track(getPreference, 'team.note_shared', {});
      const res = await flush(getPreference, createMockFetch(capture));
      expect(res.ok).toBe(true);
      expect(capture.body.events.length).toBe(4);
    });

    it('tracks custom extension events', async () => {
      const capture = {};
      const getPreference = (key) => (key === 'telemetry' ? true : undefined);
      track(getPreference, 'custom.my_extension_action', { detail: 'clicked' });
      track(getPreference, 'extension.tab_loaded', { extension_id: 'kanban' });
      const res = await flush(getPreference, createMockFetch(capture));
      expect(res.ok).toBe(true);
      expect(capture.body.events.length).toBe(2);
      expect(capture.body.events[0].event).toBe('custom.my_extension_action');
      expect(capture.body.events[0].properties.detail).toBe('clicked');
      expect(capture.body.events[1].event).toBe('extension.tab_loaded');
    });
  });
});
