const path = require('path');
const fs = require('fs');
const os = require('os');
const {
  getComposerManifestInfo,
  parseComposerOutdatedJson,
  parseComposerValidateOutput,
  parseComposerAuditJson,
} = require('../composer');

describe('composer', () => {
  describe('getComposerManifestInfo', () => {
    it('returns error when composer.json does not exist', () => {
      const fsMock = { existsSync: () => false };
      const result = getComposerManifestInfo('/proj', fsMock);
      expect(result.ok).toBe(false);
      expect(result.error).toContain('composer.json');
    });

    it('returns error when composer.json is invalid JSON', () => {
      const fsMock = {
        existsSync: (p) => p.endsWith('composer.json') || p.endsWith('composer.lock'),
        readFileSync: (p) => (p.endsWith('composer.json') ? '{ invalid' : ''),
      };
      const result = getComposerManifestInfo('/proj', fsMock);
      expect(result.ok).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns require and require-dev counts and hasLock', () => {
      const fsMock = {
        existsSync: (p) => {
          if (p.endsWith('composer.json')) return true;
          if (p.endsWith('composer.lock')) return true;
          return false;
        },
        readFileSync: (p) => {
          if (p.endsWith('composer.json')) {
            return JSON.stringify({
              require: { 'php': '^8.0', 'vendor/foo': '^1.0', 'vendor/bar': '^2.0' },
              'require-dev': { 'phpunit/phpunit': '^9.0' },
            });
          }
          return '';
        },
      };
      const result = getComposerManifestInfo('/proj', fsMock);
      expect(result.ok).toBe(true);
      expect(result.requireCount).toBe(3);
      expect(result.requireDevCount).toBe(1);
      expect(result.hasLock).toBe(true);
    });

    it('returns requireCount 0 when require is missing or not an object', () => {
      const fsMock = {
        existsSync: (p) => p.endsWith('composer.json'),
        readFileSync: (p) => {
          if (p.endsWith('composer.json')) {
            return JSON.stringify({});
          }
          return '';
        },
      };
      const result = getComposerManifestInfo('/proj', fsMock);
      expect(result.ok).toBe(true);
      expect(result.requireCount).toBe(0);
      expect(result.requireDevCount).toBe(0);
    });

    it('returns requireDevCount 0 when require-dev is null', () => {
      const fsMock = {
        existsSync: (p) => p.endsWith('composer.json'),
        readFileSync: (p) => {
          if (p.endsWith('composer.json')) {
            return JSON.stringify({ require: {}, 'require-dev': null });
          }
          return '';
        },
      };
      const result = getComposerManifestInfo('/proj', fsMock);
      expect(result.ok).toBe(true);
      expect(result.requireCount).toBe(0);
      expect(result.requireDevCount).toBe(0);
    });

    it('returns hasLock false when composer.lock does not exist', () => {
      const fsMock = {
        existsSync: (p) => p.endsWith('composer.json'),
        readFileSync: (p) => (p.endsWith('composer.json') ? '{"require":{"php":"^8.0"}}' : ''),
      };
      const result = getComposerManifestInfo('/proj', fsMock);
      expect(result.ok).toBe(true);
      expect(result.hasLock).toBe(false);
      expect(result.requireCount).toBe(1);
    });

    it('returns phpRequire, license, description, scripts', () => {
      const fsMock = {
        existsSync: (p) => p.endsWith('composer.json'),
        readFileSync: (p) => {
          if (p.endsWith('composer.json')) {
            return JSON.stringify({
              require: { php: '^8.2' },
              license: 'MIT',
              description: 'My PHP lib',
              scripts: { test: 'phpunit', 'cs-fix': 'php-cs-fixer fix' },
            });
          }
          return '';
        },
      };
      const result = getComposerManifestInfo('/proj', fsMock);
      expect(result.ok).toBe(true);
      expect(result.phpRequire).toBe('^8.2');
      expect(result.license).toBe('MIT');
      expect(result.description).toBe('My PHP lib');
      expect(result.scripts).toEqual(['test', 'cs-fix']);
    });

    it('returns license null when license is empty array', () => {
      const fsMock = {
        existsSync: (p) => p.endsWith('composer.json'),
        readFileSync: (p) => (p.endsWith('composer.json') ? JSON.stringify({ require: {}, license: [] }) : ''),
      };
      const result = getComposerManifestInfo('/proj', fsMock);
      expect(result.ok).toBe(true);
      expect(result.license).toBeUndefined();
    });

    it('returns license as joined string when license is array with items', () => {
      const fsMock = {
        existsSync: (p) => p.endsWith('composer.json'),
        readFileSync: (p) => (p.endsWith('composer.json') ? JSON.stringify({ require: {}, license: ['MIT', 'Apache-2.0'] }) : ''),
      };
      const result = getComposerManifestInfo('/proj', fsMock);
      expect(result.ok).toBe(true);
      expect(result.license).toBe('MIT, Apache-2.0');
    });

    it('returns error when readFileSync throws', () => {
      const fsMock = {
        existsSync: () => true,
        readFileSync: () => {
          throw new Error('ENOENT');
        },
      };
      const result = getComposerManifestInfo('/proj', fsMock);
      expect(result.ok).toBe(false);
      expect(result.error).toBe('ENOENT');
    });

    it('returns fallback error when thrown error has no message', () => {
      const fsMock = {
        existsSync: () => true,
        readFileSync: () => {
          throw new Error();
        },
      };
      const result = getComposerManifestInfo('/proj', fsMock);
      expect(result.ok).toBe(false);
      expect(result.error).toBe('Failed to read composer manifest');
    });

    it('uses default fs when fsImpl not passed', () => {
      const dir = path.join(os.tmpdir(), `composer-test-${Date.now()}`);
      fs.mkdirSync(dir, { recursive: true });
      try {
        fs.writeFileSync(path.join(dir, 'composer.json'), JSON.stringify({ require: { php: '^8.1' }, name: 'test/pkg' }));
        const result = getComposerManifestInfo(dir);
        expect(result.ok).toBe(true);
        expect(result.phpRequire).toBe('^8.1');
      } finally {
        try { fs.rmSync(dir, { recursive: true }); } catch (_) {}
      }
    });
  });

  describe('parseComposerValidateOutput', () => {
    it('returns valid true when exitCode 0', () => {
      const result = parseComposerValidateOutput('', '', 0);
      expect(result.valid).toBe(true);
    });
    it('returns valid false and lockOutOfDate when message contains lock file not up to date', () => {
      const result = parseComposerValidateOutput('', 'The lock file is not up to date.', 1);
      expect(result.valid).toBe(false);
      expect(result.lockOutOfDate).toBe(true);
    });
    it('returns lockOutOfDate when message contains lockfile not up to date', () => {
      const result = parseComposerValidateOutput('', 'The lockfile is not up to date.', 1);
      expect(result.lockOutOfDate).toBe(true);
    });
    it('includes message when output is non-empty', () => {
      const result = parseComposerValidateOutput('Checking composer.json', '', 0);
      expect(result.message).toBe('Checking composer.json');
    });
  });

  describe('parseComposerAuditJson', () => {
    it('returns empty advisories for empty string', () => {
      const result = parseComposerAuditJson('');
      expect(result.ok).toBe(true);
      expect(result.advisories).toEqual([]);
    });
    it('returns empty advisories when data has no advisories key or advisories is not an object', () => {
      expect(parseComposerAuditJson('{}').ok).toBe(true);
      expect(parseComposerAuditJson('{}').advisories).toEqual([]);
      expect(parseComposerAuditJson(JSON.stringify({ advisories: null })).ok).toBe(true);
      expect(parseComposerAuditJson(JSON.stringify({ advisories: null })).advisories).toEqual([]);
      expect(parseComposerAuditJson(JSON.stringify({ advisories: 'string' })).ok).toBe(true);
      expect(parseComposerAuditJson(JSON.stringify({ advisories: 'string' })).advisories).toEqual([]);
    });
    it('returns error when stdout is not a string', () => {
      expect(parseComposerAuditJson(null).ok).toBe(false);
      expect(parseComposerAuditJson(undefined).ok).toBe(false);
    });
    it('parses audit JSON with advisories', () => {
      const stdout = JSON.stringify({
        advisories: {
          'vendor/foo': [
            { advisory: 'SQL injection', severity: 'critical', url: 'https://example.com/advisory', packageVersion: '1.0.0' },
          ],
        },
      });
      const result = parseComposerAuditJson(stdout);
      expect(result.ok).toBe(true);
      expect(result.advisories).toHaveLength(1);
      expect(result.advisories[0].name).toBe('vendor/foo');
      expect(result.advisories[0].advisory).toBe('SQL injection');
      expect(result.advisories[0].severity).toBe('critical');
      expect(result.advisories[0].link).toBe('https://example.com/advisory');
      expect(result.advisories[0].version).toBe('1.0.0');
    });
    it('uses title when advisory is not a string', () => {
      const stdout = JSON.stringify({
        advisories: {
          'vendor/bar': [{ title: 'XSS issue', packageVersion: '2.0.0' }],
        },
      });
      const result = parseComposerAuditJson(stdout);
      expect(result.ok).toBe(true);
      expect(result.advisories[0].advisory).toBe('XSS issue');
    });
    it("uses 'Security advisory' when advisory and title missing", () => {
      const stdout = JSON.stringify({
        advisories: {
          'vendor/baz': [{}],
        },
      });
      const result = parseComposerAuditJson(stdout);
      expect(result.ok).toBe(true);
      expect(result.advisories[0].advisory).toBe('Security advisory');
    });
    it('treats single object as one-item list when value is not array', () => {
      const stdout = JSON.stringify({
        advisories: {
          'vendor/one': { advisory: 'One advisory', packageVersion: '1.0' },
        },
      });
      const result = parseComposerAuditJson(stdout);
      expect(result.ok).toBe(true);
      expect(result.advisories).toHaveLength(1);
      expect(result.advisories[0].name).toBe('vendor/one');
      expect(result.advisories[0].advisory).toBe('One advisory');
    });
    it('skips when list is null or falsy', () => {
      const stdout = JSON.stringify({
        advisories: {
          'vendor/empty': null,
          'vendor/listed': [{ advisory: 'A', packageVersion: '1.0' }],
        },
      });
      const result = parseComposerAuditJson(stdout);
      expect(result.ok).toBe(true);
      expect(result.advisories).toHaveLength(1);
      expect(result.advisories[0].name).toBe('vendor/listed');
    });

    it('skips when list is falsy non-null (0 or false) so items = []', () => {
      const stdout = JSON.stringify({
        advisories: {
          'vendor/zero': 0,
          'vendor/false': false,
          'vendor/one': [{ advisory: 'One' }],
        },
      });
      const result = parseComposerAuditJson(stdout);
      expect(result.ok).toBe(true);
      expect(result.advisories).toHaveLength(1);
      expect(result.advisories[0].name).toBe('vendor/one');
    });

    it('treats truthy non-array list as single-item list (e.g. number)', () => {
      const stdout = JSON.stringify({
        advisories: {
          'vendor/weird': 42,
        },
      });
      const result = parseComposerAuditJson(stdout);
      expect(result.ok).toBe(true);
      expect(result.advisories).toHaveLength(1);
      expect(result.advisories[0].name).toBe('vendor/weird');
      expect(result.advisories[0].advisory).toBe('Security advisory');
    });
    it('handles advisories value as empty array', () => {
      const stdout = JSON.stringify({
        advisories: {
          'vendor/empty': [],
          'vendor/one': [{ advisory: 'One' }],
        },
      });
      const result = parseComposerAuditJson(stdout);
      expect(result.ok).toBe(true);
      expect(result.advisories).toHaveLength(1);
      expect(result.advisories[0].advisory).toBe('One');
    });
    it('hits all list shapes in one call (array, single object, null)', () => {
      const stdout = JSON.stringify({
        advisories: {
          'pkgA': [],
          'pkgB': { advisory: 'Single', url: 'https://x.com' },
          'pkgC': null,
          'pkgD': [{ advisory: 'Listed', severity: 'high' }],
        },
      });
      const result = parseComposerAuditJson(stdout);
      expect(result.ok).toBe(true);
      expect(result.advisories).toHaveLength(2);
      expect(result.advisories[0].advisory).toBe('Single');
      expect(result.advisories[0].link).toBe('https://x.com');
      expect(result.advisories[1].advisory).toBe('Listed');
      expect(result.advisories[1].severity).toBe('high');
    });
    it('omits severity and link when not strings', () => {
      const stdout = JSON.stringify({
        advisories: {
          'vendor/x': [{ advisory: 'X', severity: 123, url: 456 }],
        },
      });
      const result = parseComposerAuditJson(stdout);
      expect(result.ok).toBe(true);
      expect(result.advisories[0].severity).toBeUndefined();
      expect(result.advisories[0].link).toBeUndefined();
    });
    it('omits version when packageVersion is null', () => {
      const stdout = JSON.stringify({
        advisories: {
          'vendor/nover': [{ advisory: 'No version' }],
        },
      });
      const result = parseComposerAuditJson(stdout);
      expect(result.ok).toBe(true);
      expect(result.advisories[0].version).toBeUndefined();
    });
    it('returns error for invalid JSON', () => {
      const result = parseComposerAuditJson('not json');
      expect(result.ok).toBe(false);
      expect(result.error).toContain('Invalid JSON');
    });
  });

  describe('parseComposerOutdatedJson', () => {
    it('returns empty packages for empty string', () => {
      const result = parseComposerOutdatedJson('');
      expect(result.ok).toBe(true);
      expect(result.packages).toEqual([]);
    });
    it('returns error when stdout is not a string', () => {
      expect(parseComposerOutdatedJson(null).ok).toBe(false);
      expect(parseComposerOutdatedJson(123).ok).toBe(false);
    });

    it('parses composer outdated JSON output', () => {
      const stdout = JSON.stringify({
        installed: [
          { name: 'vendor/foo', version: '1.0.0', latest: '1.2.0', 'latest-status': 'semver-safe-update' },
          { name: 'vendor/bar', version: '2.0.0', latest: '2.0.0', 'latest-status': 'up-to-date' },
        ],
      });
      const result = parseComposerOutdatedJson(stdout);
      expect(result.ok).toBe(true);
      expect(result.packages).toHaveLength(2);
      expect(result.packages[0]).toEqual({ name: 'vendor/foo', version: '1.0.0', latest: '1.2.0', latestStatus: 'semver-safe-update' });
      expect(result.packages[1].latestStatus).toBe('up-to-date');
    });

    it('returns error for invalid JSON', () => {
      const result = parseComposerOutdatedJson('not json');
      expect(result.ok).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns empty packages when installed is missing or not array', () => {
      expect(parseComposerOutdatedJson(JSON.stringify({})).packages).toEqual([]);
      expect(parseComposerOutdatedJson(JSON.stringify({ installed: null })).packages).toEqual([]);
    });

    it('filters out packages with empty name and uses fallbacks for missing fields', () => {
      const stdout = JSON.stringify({
        installed: [
          { name: 'vendor/foo', version: '1.0.0', latest: '1.1.0', 'latest-status': 'ok' },
          { name: '', version: '2.0.0' },
          { name: 'vendor/bar' },
        ],
      });
      const result = parseComposerOutdatedJson(stdout);
      expect(result.ok).toBe(true);
      expect(result.packages).toHaveLength(2);
      expect(result.packages[0].name).toBe('vendor/foo');
      expect(result.packages[1].name).toBe('vendor/bar');
      expect(result.packages[1].version).toBe('—');
      expect(result.packages[1].latest).toBe('—');
      expect(result.packages[1].latestStatus).toBe('');
    });

    it('uses fallbacks when version, latest, or latest-status are not strings', () => {
      const stdout = JSON.stringify({
        installed: [
          { name: 'vendor/number', version: 1, latest: 2, 'latest-status': 3 },
        ],
      });
      const result = parseComposerOutdatedJson(stdout);
      expect(result.ok).toBe(true);
      expect(result.packages[0].version).toBe('—');
      expect(result.packages[0].latest).toBe('—');
      expect(result.packages[0].latestStatus).toBe('');
    });

    it('uses empty string for name when name is not a string and filters out', () => {
      const stdout = JSON.stringify({
        installed: [
          { name: 123, version: '1.0.0', latest: '1.0.0', 'latest-status': 'up-to-date' },
        ],
      });
      const result = parseComposerOutdatedJson(stdout);
      expect(result.ok).toBe(true);
      expect(result.packages).toHaveLength(0);
    });
  });
});
