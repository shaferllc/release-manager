const { createGitTags } = require('../tags');

describe('git tags', () => {
  const dir = '/repo';

  describe('getTags', () => {
    it('returns tags sorted', async () => {
      const runInDir = jest.fn().mockResolvedValue({ stdout: 'v2.0.0\nv1.0.0\n' });
      const api = createGitTags({ runInDir });
      const result = await api.getTags(dir);
      expect(result.ok).toBe(true);
      expect(result.tags).toEqual(['v2.0.0', 'v1.0.0']);
    });

    it('returns ok false on throw', async () => {
      const runInDir = jest.fn().mockRejectedValue(new Error('fail'));
      const api = createGitTags({ runInDir });
      const result = await api.getTags(dir);
      expect(result.ok).toBe(false);
      expect(result.tags).toEqual([]);
    });
  });

  describe('checkoutTag', () => {
    it('calls checkout tag', async () => {
      const runInDir = jest.fn().mockResolvedValue({});
      const api = createGitTags({ runInDir });
      const result = await api.checkoutTag(dir, 'v1.0.0');
      expect(result.ok).toBe(true);
      expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['checkout', 'v1.0.0']);
    });

    it('returns error when tag name empty', async () => {
      const api = createGitTags({ runInDir: jest.fn() });
      const result = await api.checkoutTag(dir, '');
      expect(result.ok).toBe(false);
    });
  });

  describe('createTag', () => {
    it('creates lightweight tag when message empty', async () => {
      const runInDir = jest.fn().mockResolvedValue({});
      const api = createGitTags({ runInDir });
      await api.createTag(dir, 'v1.0.0', null, 'HEAD');
      expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['tag', 'v1.0.0', 'HEAD']);
    });

    it('creates annotated tag when message provided', async () => {
      const runInDir = jest.fn().mockResolvedValue({});
      const api = createGitTags({ runInDir });
      await api.createTag(dir, 'v1.0.0', 'Release 1.0', 'HEAD');
      expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['tag', '-a', 'v1.0.0', '-m', 'Release 1.0', 'HEAD']);
    });
  });

  describe('deleteTag', () => {
    it('calls tag -d', async () => {
      const runInDir = jest.fn().mockResolvedValue({});
      const api = createGitTags({ runInDir });
      await api.deleteTag(dir, 'v1.0.0');
      expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['tag', '-d', 'v1.0.0']);
    });
  });

  describe('pushTag', () => {
    it('calls push remote refs/tags/tag', async () => {
      const runInDir = jest.fn().mockResolvedValue({});
      const api = createGitTags({ runInDir });
      await api.pushTag(dir, 'v1.0.0', 'origin');
      expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['push', 'origin', 'refs/tags/v1.0.0']);
    });

    it('defaults remote to origin', async () => {
      const runInDir = jest.fn().mockResolvedValue({});
      const api = createGitTags({ runInDir });
      await api.pushTag(dir, 'v1.0.0');
      expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['push', 'origin', 'refs/tags/v1.0.0']);
    });
  });
});
