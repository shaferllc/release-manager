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

    it('uses "project" when dirPath is missing and name is missing', () => {
      const content = JSON.stringify({ version: '1.0.0' });
      expect(parsePackageInfo(content, null)).toEqual({
        ok: true,
        name: 'project',
        version: '1.0.0',
      });
    });
  });
});
