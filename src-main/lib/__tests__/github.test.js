const { getReleasesUrl, getActionsUrl, getRepoSlug, pickAssetForPlatform } = require('../github');

describe('github', () => {
  describe('getReleasesUrl', () => {
    it('returns GitHub releases URL for https remote', () => {
      expect(getReleasesUrl('https://github.com/owner/repo.git')).toBe(
        'https://github.com/owner/repo/releases'
      );
      expect(getReleasesUrl('https://github.com/user/my-app')).toBe(
        'https://github.com/user/my-app/releases'
      );
    });

    it('returns GitHub releases URL for ssh remote', () => {
      expect(getReleasesUrl('git@github.com:owner/repo.git')).toBe(
        'https://github.com/owner/repo/releases'
      );
    });

    it('returns null for non-GitHub remote', () => {
      expect(getReleasesUrl('https://gitlab.com/owner/repo')).toBeNull();
      expect(getReleasesUrl('')).toBeNull();
      expect(getReleasesUrl(null)).toBeNull();
    });

    it('returns null for invalid input', () => {
      expect(getReleasesUrl(123)).toBeNull();
    });
  });

  describe('getActionsUrl', () => {
    it('returns GitHub Actions URL for https remote', () => {
      expect(getActionsUrl('https://github.com/owner/repo.git')).toBe(
        'https://github.com/owner/repo/actions'
      );
    });
    it('returns null for non-GitHub remote', () => {
      expect(getActionsUrl('https://gitlab.com/a/b')).toBeNull();
      expect(getActionsUrl('')).toBeNull();
    });
  });

  describe('getRepoSlug', () => {
    it('parses owner and repo from https URL', () => {
      expect(getRepoSlug('https://github.com/owner/repo.git')).toEqual({
        owner: 'owner',
        repo: 'repo',
      });
      expect(getRepoSlug('https://github.com/user/my-app')).toEqual({
        owner: 'user',
        repo: 'my-app',
      });
    });

    it('parses owner and repo from ssh URL', () => {
      expect(getRepoSlug('git@github.com:org/name.git')).toEqual({
        owner: 'org',
        repo: 'name',
      });
    });

    it('returns null for non-GitHub or invalid', () => {
      expect(getRepoSlug('https://gitlab.com/a/b')).toBeNull();
      expect(getRepoSlug('')).toBeNull();
      expect(getRepoSlug(null)).toBeNull();
    });
  });

  describe('pickAssetForPlatform', () => {
    const assets = [
      { name: 'app.dmg', browser_download_url: 'https://x/app.dmg' },
      { name: 'app.zip', browser_download_url: 'https://x/app.zip' },
      { name: 'app.exe', browser_download_url: 'https://x/app.exe' },
      { name: 'app.AppImage', browser_download_url: 'https://x/app.AppImage' },
    ];

    it('prefers .dmg on darwin', () => {
      const picked = pickAssetForPlatform(assets, 'darwin');
      expect(picked.name).toBe('app.dmg');
    });

    it('prefers .exe on win32', () => {
      const picked = pickAssetForPlatform(assets, 'win32');
      expect(picked.name).toBe('app.exe');
    });

    it('prefers .AppImage on linux', () => {
      const picked = pickAssetForPlatform(assets, 'linux');
      expect(picked.name).toBe('app.AppImage');
    });

    it('falls back to first asset when no platform match', () => {
      const onlyZip = [{ name: 'app.zip', browser_download_url: 'x' }];
      expect(pickAssetForPlatform(onlyZip, 'darwin').name).toBe('app.zip');
    });

    it('returns first asset when no extension matches platform', () => {
      const noMatch = [{ name: 'app.xyz', browser_download_url: 'x' }];
      expect(pickAssetForPlatform(noMatch, 'darwin').name).toBe('app.xyz');
    });

    it('uses process.platform when platform not passed', () => {
      const assets = [{ name: 'app.dmg' }, { name: 'app.exe' }, { name: 'app.AppImage' }];
      const picked = pickAssetForPlatform(assets);
      expect(picked).not.toBeNull();
      expect(['app.dmg', 'app.exe', 'app.AppImage']).toContain(picked.name);
    });

    it('returns null for empty or invalid assets', () => {
      expect(pickAssetForPlatform([], 'darwin')).toBeNull();
      expect(pickAssetForPlatform(null, 'darwin')).toBeNull();
    });

    it('matches extension case-insensitively', () => {
      const dmg = [{ name: 'App.DMG', browser_download_url: 'x' }];
      expect(pickAssetForPlatform(dmg, 'darwin').name).toBe('App.DMG');
    });
  });
});
