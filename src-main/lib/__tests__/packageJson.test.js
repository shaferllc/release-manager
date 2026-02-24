const path = require('path');
const { parsePackageInfo } = require('../packageJson');

describe('packageJson', () => {
  describe('parsePackageInfo', () => {
    it('returns name and version from valid JSON', () => {
      const content = JSON.stringify({ name: 'my-app', version: '1.2.3' });
      expect(parsePackageInfo(content, '/dir/my-app')).toEqual({
        ok: true,
        name: 'my-app',
        version: '1.2.3',
      });
    });

    it('uses dir basename when name is missing', () => {
      const content = JSON.stringify({ version: '0.0.1' });
      expect(parsePackageInfo(content, '/path/to/my-project')).toEqual({
        ok: true,
        name: 'my-project',
        version: '0.0.1',
      });
    });

    it('returns version null when missing or invalid', () => {
      const content = JSON.stringify({ name: 'x' });
      expect(parsePackageInfo(content, '/d')).toEqual({
        ok: true,
        name: 'x',
        version: null,
      });
    });

    it('returns error for invalid JSON', () => {
      expect(parsePackageInfo('not json', '/dir')).toEqual({
        ok: false,
        error: 'No package.json or invalid JSON',
        path: '/dir',
      });
    });

    it('returns error for empty content', () => {
      expect(parsePackageInfo('', '/dir')).toEqual({
        ok: false,
        error: 'No package.json or invalid JSON',
        path: '/dir',
      });
    });

    it('returns error for undefined or non-string content', () => {
      expect(parsePackageInfo(undefined, '/dir').ok).toBe(false);
      expect(parsePackageInfo(null, '/dir').ok).toBe(false);
    });

    it('returns version null when version is non-string', () => {
      const content = JSON.stringify({ name: 'x', version: 1.0 });
      expect(parsePackageInfo(content, '/d')).toEqual({
        ok: true,
        name: 'x',
        version: null,
      });
    });

    it('uses "project" when dirPath is missing and name is missing', () => {
      const content = JSON.stringify({ version: '1.0.0' });
      expect(parsePackageInfo(content, null)).toEqual({
        ok: true,
        name: 'project',
        version: '1.0.0',
      });
    });

    it('uses custom pathImpl when provided', () => {
      const content = JSON.stringify({ version: '2.0.0' });
      const pathImpl = { basename: (p) => (p === '/custom/dir' ? 'custom-name' : 'other') };
      expect(parsePackageInfo(content, '/custom/dir', pathImpl)).toEqual({
        ok: true,
        name: 'custom-name',
        version: '2.0.0',
      });
    });
  });
});
