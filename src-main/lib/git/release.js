/**
 * Release flow: tag and push (stage package.json, commit, tag, push). Uses formatTag for version string.
 * @param {{ runInDir: Function, path: Object, fs: Object, formatTag: Function, getPushRemote: Function, stageFile: Function, gitCommit: Function, createTag: Function }} deps
 */
function createGitRelease(deps) {
  const { runInDir, path, fs, formatTag, getPushRemote, stageFile, gitCommit, createTag } = deps;

  async function gitTagAndPush(dirPath, tagMessage, options = {}) {
    const versionOverride = options.version;
    try {
      let version;
      if (versionOverride != null && typeof versionOverride === 'string') {
        version = versionOverride;
      } else {
        const pkgPath = path.join(dirPath, 'package.json');
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        version = pkg.version;
      }
      const tag = formatTag(version);
      if (!tag) throw new Error('Invalid version');
      if (versionOverride == null) {
        await stageFile(dirPath, 'package.json');
        if (fs.existsSync(path.join(dirPath, 'package-lock.json'))) {
          await stageFile(dirPath, 'package-lock.json');
        }
        const commitResult = await gitCommit(dirPath, tagMessage || `chore: release ${tag}`);
        if (!commitResult.ok) throw new Error(commitResult.error || 'Commit failed');
      }
      const tagResult = await createTag(dirPath, tag, null, 'HEAD');
      if (!tagResult.ok) throw new Error(tagResult.error || 'Create tag failed');
      const remote = await getPushRemote(dirPath);
      const target = remote || 'origin';
      await runInDir(dirPath, 'git', ['push', target, 'HEAD']);
      await runInDir(dirPath, 'git', ['push', target, tag]);
      return { ok: true, tag };
    } catch (e) {
      return { ok: false, error: e.message || 'git tag/push failed' };
    }
  }

  return { gitTagAndPush };
}

module.exports = { createGitRelease };
