const { createGitStub, DISABLED_MSG } = require('../stub');

describe('git plugin stub', () => {
  it('returns stub with all git API methods', () => {
    const stub = createGitStub();
    expect(stub.getGitStatus).toBeDefined();
    expect(stub.getBranches).toBeDefined();
    expect(stub.gitPull).toBeDefined();
    expect(stub.getProjectInfoFromGit).toBeDefined();
    expect(stub.gitTagAndPush).toBeDefined();
  });

  it('async methods return promise resolving to { ok: false, error }', async () => {
    const stub = createGitStub();
    const result = await stub.getGitStatus('/some/path');
    expect(result).toEqual({ ok: false, error: DISABLED_MSG });
    const result2 = await stub.getProjectInfoFromGit('/some/path');
    expect(result2).toEqual({ ok: false, error: DISABLED_MSG });
  });

  it('exports DISABLED_MSG constant', () => {
    expect(DISABLED_MSG).toBe('Git plugin is disabled');
  });
});
