const { getPlugins, getGitPlugin } = require('../index');

describe('plugins', () => {
  it('getPlugins returns array of plugins', () => {
    const plugins = getPlugins();
    expect(Array.isArray(plugins)).toBe(true);
    expect(plugins.length).toBeGreaterThanOrEqual(1);
  });

  it('getPlugins includes git plugin', () => {
    const plugins = getPlugins();
    const git = plugins.find((p) => p.id === 'git');
    expect(git).toBeDefined();
    expect(git.createApi).toBeDefined();
    expect(git.createStub).toBeDefined();
    expect(git.isEnabled).toBeDefined();
  });

  it('getGitPlugin returns the git plugin', () => {
    const git = getGitPlugin();
    expect(git).not.toBeNull();
    expect(git.id).toBe('git');
  });
});
