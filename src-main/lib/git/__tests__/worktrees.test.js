const { createGitWorktrees } = require('../worktrees');

describe('git worktrees', () => {
  const dir = '/repo';
  const path = require('path');

  it('getWorktrees parses porcelain list', async () => {
    const runInDir = jest.fn().mockResolvedValue({
      stdout: 'worktree /main\nHEAD abc123\nbranch refs/heads/main\nworktree /feature\nHEAD def456\nbranch refs/heads/feature\n',
    });
    const api = createGitWorktrees({ runInDir, path });
    const result = await api.getWorktrees(dir);
    expect(result.ok).toBe(true);
    expect(result.worktrees.length).toBeGreaterThanOrEqual(1);
  });

  it('worktreeAdd returns error when path empty', async () => {
    const api = createGitWorktrees({ runInDir: jest.fn(), path });
    const result = await api.worktreeAdd(dir, '', 'branch');
    expect(result.ok).toBe(false);
  });

  it('worktreeAdd calls worktree add with -b when branch', async () => {
    const runInDir = jest.fn().mockResolvedValue({});
    const api = createGitWorktrees({ runInDir, path });
    await api.worktreeAdd(dir, '../wt', 'feature');
    expect(runInDir).toHaveBeenCalledWith(dir, 'git', expect.arrayContaining(['worktree', 'add', expect.any(String), '-b', 'feature']));
  });

  it('worktreeRemove calls worktree remove', async () => {
    const runInDir = jest.fn().mockResolvedValue({});
    const api = createGitWorktrees({ runInDir, path });
    await api.worktreeRemove(dir, '../wt');
    expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['worktree', 'remove', '../wt']);
  });
});
