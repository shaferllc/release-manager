const path = require('path');
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
  });

  describe('parseComposerAuditJson', () => {
    it('returns empty advisories for empty string', () => {
      const result = parseComposerAuditJson('');
      expect(result.ok).toBe(true);
      expect(result.advisories).toEqual([]);
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
  });

  describe('parseComposerOutdatedJson', () => {
    it('returns empty packages for empty string', () => {
      const result = parseComposerOutdatedJson('');
      expect(result.ok).toBe(true);
      expect(result.packages).toEqual([]);
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
  });
});
