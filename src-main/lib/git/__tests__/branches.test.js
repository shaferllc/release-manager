const { createGitBranches } = require('../branches');

describe('git branches', () => {
  const dir = '/repo';
  const parseLocalBranches = (stdout) =>
    (stdout || '')
      .trim()
      .split(/\r?\n/)
      .map((line) => ({ name: line.replace(/^\*?\s*/, '').trim(), current: line.startsWith('*') }));
  const parseRemoteBranches = (stdout) =>
    (stdout || '')
      .trim()
      .split(/\r?\n/)
      .filter((line) => !line.includes('HEAD'))
      .map((line) => line.replace(/^[\s*]+/, '').trim());

  describe('getBranches', () => {
    it('returns branches and current', async () => {
      const runInDir = jest
        .fn()
        .mockResolvedValueOnce({ stdout: '* main\n  feature\n' })
        .mockResolvedValueOnce({ stdout: 'main\n' });
      const api = createGitBranches({ runInDir, parseLocalBranches, parseRemoteBranches });
      const result = await api.getBranches(dir);
      expect(result.ok).toBe(true);
      expect(result.branches).toHaveLength(2);
      expect(result.current).toBe('main');
    });

    it('returns ok false on throw', async () => {
      const runInDir = jest.fn().mockRejectedValue(new Error('fail'));
      const api = createGitBranches({ runInDir, parseLocalBranches, parseRemoteBranches });
      const result = await api.getBranches(dir);
      expect(result.ok).toBe(false);
      expect(result.branches).toEqual([]);
    });
  });

  describe('checkoutBranch', () => {
    it('calls checkout with name', async () => {
      const runInDir = jest.fn().mockResolvedValue({});
      const api = createGitBranches({ runInDir, parseLocalBranches, parseRemoteBranches });
      const result = await api.checkoutBranch(dir, 'feature');
      expect(result.ok).toBe(true);
      expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['checkout', 'feature']);
    });

    it('returns error when branch name empty', async () => {
      const api = createGitBranches({ runInDir: jest.fn(), parseLocalBranches, parseRemoteBranches });
      const result = await api.checkoutBranch(dir, '');
      expect(result.ok).toBe(false);
      expect(result.error).toContain('required');
    });
  });

  describe('createBranch', () => {
    it('calls checkout -b when checkout true', async () => {
      const runInDir = jest.fn().mockResolvedValue({});
      const api = createGitBranches({ runInDir, parseLocalBranches, parseRemoteBranches });
      await api.createBranch(dir, 'new', true);
      expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['checkout', '-b', 'new']);
    });

    it('calls branch when checkout false', async () => {
      const runInDir = jest.fn().mockResolvedValue({});
      const api = createGitBranches({ runInDir, parseLocalBranches, parseRemoteBranches });
      await api.createBranch(dir, 'new', false);
      expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['branch', 'new']);
    });
  });

  describe('createBranchFrom', () => {
    it('returns error when fromRef empty', async () => {
      const api = createGitBranches({ runInDir: jest.fn(), parseLocalBranches, parseRemoteBranches });
      const result = await api.createBranchFrom(dir, 'new', '');
      expect(result.ok).toBe(false);
    });

    it('calls checkout -b name ref', async () => {
      const runInDir = jest.fn().mockResolvedValue({});
      const api = createGitBranches({ runInDir, parseLocalBranches, parseRemoteBranches });
      await api.createBranchFrom(dir, 'new', 'main');
      expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['checkout', '-b', 'new', 'main']);
    });
  });

  describe('renameBranch', () => {
    it('calls branch -m old new when oldName provided', async () => {
      const runInDir = jest.fn().mockResolvedValue({});
      const api = createGitBranches({ runInDir, parseLocalBranches, parseRemoteBranches });
      await api.renameBranch(dir, 'old', 'new');
      expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['branch', '-m', 'old', 'new']);
    });

    it('calls branch -m new when only newName (rename current)', async () => {
      const runInDir = jest.fn().mockResolvedValue({});
      const api = createGitBranches({ runInDir, parseLocalBranches, parseRemoteBranches });
      await api.renameBranch(dir, '', 'new');
      expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['branch', '-m', 'new']);
    });
  });

  describe('getRemoteBranches', () => {
    it('fetches and parses remote branches', async () => {
      const runInDir = jest
        .fn()
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ stdout: '  origin/main\n  origin/feature\n' });
      const api = createGitBranches({ runInDir, parseLocalBranches, parseRemoteBranches });
      const result = await api.getRemoteBranches(dir);
      expect(result.ok).toBe(true);
      expect(result.branches.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('checkoutRemoteBranch', () => {
    it('returns error when ref has no slash', async () => {
      const api = createGitBranches({ runInDir: jest.fn(), parseLocalBranches, parseRemoteBranches });
      const result = await api.checkoutRemoteBranch(dir, 'main');
      expect(result.ok).toBe(false);
    });

    it('calls checkout --track ref', async () => {
      const runInDir = jest.fn().mockResolvedValue({});
      const api = createGitBranches({ runInDir, parseLocalBranches, parseRemoteBranches });
      await api.checkoutRemoteBranch(dir, 'origin/feature');
      expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['checkout', '--track', 'origin/feature']);
    });
  });

  describe('deleteBranch', () => {
    it('calls branch -d when force false', async () => {
      const runInDir = jest.fn().mockResolvedValue({});
      const api = createGitBranches({ runInDir, parseLocalBranches, parseRemoteBranches });
      await api.deleteBranch(dir, 'old', false);
      expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['branch', '-d', 'old']);
    });

    it('calls branch -D when force true', async () => {
      const runInDir = jest.fn().mockResolvedValue({});
      const api = createGitBranches({ runInDir, parseLocalBranches, parseRemoteBranches });
      await api.deleteBranch(dir, 'old', true);
      expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['branch', '-D', 'old']);
    });
  });

  describe('deleteRemoteBranch', () => {
    it('calls push remote --delete name', async () => {
      const runInDir = jest.fn().mockResolvedValue({});
      const api = createGitBranches({ runInDir, parseLocalBranches, parseRemoteBranches });
      await api.deleteRemoteBranch(dir, 'origin', 'feature');
      expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['push', 'origin', '--delete', 'feature']);
    });
  });

  describe('setBranchUpstream', () => {
    it('calls branch --set-upstream-to', async () => {
      const runInDir = jest.fn().mockResolvedValue({});
      const api = createGitBranches({ runInDir, parseLocalBranches, parseRemoteBranches });
      await api.setBranchUpstream(dir, 'main');
      expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['branch', '--set-upstream-to=origin/main', 'main']);
    });
  });

  describe('getBranchRevision', () => {
    it('returns sha from rev-parse', async () => {
      const runInDir = jest.fn().mockResolvedValue({ stdout: 'abc123\n' });
      const api = createGitBranches({ runInDir, parseLocalBranches, parseRemoteBranches });
      const result = await api.getBranchRevision(dir, 'HEAD');
      expect(result.ok).toBe(true);
      expect(result.sha).toBe('abc123');
    });

    it('returns error when ref empty', async () => {
      const api = createGitBranches({ runInDir: jest.fn(), parseLocalBranches, parseRemoteBranches });
      const result = await api.getBranchRevision(dir, '');
      expect(result.ok).toBe(false);
    });
  });
});
