const { createGitStatus } = require('../status');

describe('git status', () => {
  const dir = '/repo';

  describe('getPushRemote', () => {
    it('returns branch remote when branch has upstream', async () => {
      const runInDir = jest
        .fn()
        .mockResolvedValueOnce({ stdout: 'main\n' })
        .mockResolvedValueOnce({ stdout: 'origin\n' });
      const api = createGitStatus({ runInDir, path: require('path'), fs: require('fs') });
      const result = await api.getPushRemote(dir);
      expect(result).toBe('origin');
      expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['branch', '--show-current']);
      expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['config', '--get', 'branch.main.remote']);
    });

    it('returns first remote when branch has no upstream', async () => {
      const runInDir = jest
        .fn()
        .mockResolvedValueOnce({ stdout: 'main\n' })
        .mockResolvedValueOnce({ stdout: '' })
        .mockResolvedValueOnce({ stdout: 'origin\nupstream\n' });
      const api = createGitStatus({ runInDir, path: require('path'), fs: require('fs') });
      const result = await api.getPushRemote(dir);
      expect(result).toBe('origin');
    });

    it('returns null when no remotes', async () => {
      const runInDir = jest
        .fn()
        .mockResolvedValueOnce({ stdout: 'main\n' })
        .mockResolvedValueOnce({ stdout: '' })
        .mockResolvedValueOnce({ stdout: '\n' });
      const api = createGitStatus({ runInDir, path: require('path'), fs: require('fs') });
      const result = await api.getPushRemote(dir);
      expect(result).toBe(null);
    });

    it('returns null on throw', async () => {
      const runInDir = jest.fn().mockRejectedValue(new Error('not a repo'));
      const api = createGitStatus({ runInDir, path: require('path'), fs: require('fs') });
      const result = await api.getPushRemote(dir);
      expect(result).toBe(null);
    });
  });

  describe('getGitStatus', () => {
    it('returns clean true when no output', async () => {
      const runInDir = jest.fn().mockResolvedValue({ stdout: '' });
      const api = createGitStatus({ runInDir, path: require('path'), fs: require('fs') });
      const result = await api.getGitStatus(dir);
      expect(result).toEqual({ clean: true, output: null });
    });

    it('returns clean false and output when changes', async () => {
      const runInDir = jest.fn().mockResolvedValue({ stdout: ' M foo.js\n' });
      const api = createGitStatus({ runInDir, path: require('path'), fs: require('fs') });
      const result = await api.getGitStatus(dir);
      expect(result.clean).toBe(false);
      expect(result.output).toContain('foo.js');
    });

    it('returns clean false and error message on throw', async () => {
      const runInDir = jest.fn().mockRejectedValue(new Error('fatal'));
      const api = createGitStatus({ runInDir, path: require('path'), fs: require('fs') });
      const result = await api.getGitStatus(dir);
      expect(result).toEqual({ clean: false, output: 'fatal' });
    });
  });

  describe('getStatusShort', () => {
    it('returns branch, ahead, behind from status -sb', async () => {
      const runInDir = jest
        .fn()
        .mockResolvedValueOnce({ stdout: '## main...origin/main [ahead 2, behind 1]\n' })
        .mockResolvedValueOnce({ stdout: 'main\n' });
      const api = createGitStatus({ runInDir, path: require('path'), fs: require('fs') });
      const result = await api.getStatusShort(dir);
      expect(result.ok).toBe(true);
      expect(result.branch).toBe('main');
      expect(result.ahead).toBe(2);
      expect(result.behind).toBe(1);
    });

    it('parses branch from status line when branch --show-current empty', async () => {
      const runInDir = jest
        .fn()
        .mockResolvedValueOnce({ stdout: '## feature\n' })
        .mockRejectedValueOnce(new Error());
      const api = createGitStatus({ runInDir, path: require('path'), fs: require('fs') });
      const result = await api.getStatusShort(dir);
      expect(result.ok).toBe(true);
      expect(result.branch).toBe('feature');
    });

    it('returns ok false on throw', async () => {
      const runInDir = jest.fn().mockRejectedValue(new Error('fail'));
      const api = createGitStatus({ runInDir, path: require('path'), fs: require('fs') });
      const result = await api.getStatusShort(dir);
      expect(result.ok).toBe(false);
      expect(result.error).toBe('fail');
    });
  });

  describe('getTrackedFiles', () => {
    it('returns files from ls-files', async () => {
      const runInDir = jest.fn().mockResolvedValue({ stdout: 'a.js\nb.js\n' });
      const api = createGitStatus({ runInDir, path: require('path'), fs: require('fs') });
      const result = await api.getTrackedFiles(dir);
      expect(result).toEqual({ ok: true, files: ['a.js', 'b.js'] });
    });

    it('returns ok false on throw', async () => {
      const runInDir = jest.fn().mockRejectedValue(new Error('fail'));
      const api = createGitStatus({ runInDir, path: require('path'), fs: require('fs') });
      const result = await api.getTrackedFiles(dir);
      expect(result.ok).toBe(false);
      expect(result.files).toEqual([]);
    });
  });

  describe('getProjectFiles', () => {
    it('returns empty when path is not a directory', () => {
      const path = require('path');
      const fs = {
        existsSync: jest.fn().mockReturnValue(false),
        statSync: jest.fn(),
        readdirSync: jest.fn(),
      };
      const api = createGitStatus({ runInDir: jest.fn(), path, fs });
      const result = api.getProjectFiles('/nonexistent');
      expect(result).toEqual({ ok: true, files: [] });
    });

    it('walks directory and skips PROJECT_FILES_SKIP_DIRS', () => {
      const path = require('path');
      const dirent = (name, isDir) => ({
        name,
        isDirectory: () => isDir,
        isFile: () => !isDir,
      });
      const fs = {
        existsSync: jest.fn().mockReturnValue(true),
        statSync: jest.fn().mockReturnValue({ isDirectory: () => true }),
        readdirSync: jest
          .fn()
          .mockReturnValueOnce([
            dirent('node_modules', true),
            dirent('src', true),
            dirent('package.json', false),
          ])
          .mockReturnValueOnce([dirent('index.js', false)]),
      };
      const api = createGitStatus({ runInDir: jest.fn(), path, fs });
      const result = api.getProjectFiles('/proj');
      expect(result.ok).toBe(true);
      expect(result.files).toContain('src/index.js');
      expect(result.files).toContain('package.json');
      expect(result.files).not.toContain('node_modules');
    });
  });
});
