/**
 * Aggregate git-derived project info: tags, branch, ahead/behind, porcelain lines.
 * Composes status, tags, log, remotes. Deps include parsePorcelainLines (from gitPorcelain).
 * @param {{ getTags: Function, getPushRemote: Function, getRemotes: Function, getGitStatus: Function, getStatusShort: Function, parsePorcelainLines: Function, runInDir: Function }} deps
 */
function createGitProjectInfo(deps) {
  const {
    getTags,
    getPushRemote,
    getRemotes,
    getGitStatus,
    getStatusShort,
    parsePorcelainLines,
    runInDir,
  } = deps;

  async function getProjectInfoFromGit(dirPath) {
    let latestTag = null;
    let allTags = [];
    let commitsSinceLatestTag = null;
    let gitRemote = null;
    let branch = null;
    let ahead = null;
    let behind = null;
    let uncommittedLines = [];
    let conflictCount = 0;

    try {
      const [tagsResult, remoteName, statusShortResult, porcelainResult] = await Promise.all([
        getTags(dirPath),
        getPushRemote(dirPath),
        getStatusShort(dirPath),
        getGitStatus(dirPath),
      ]);

      if (tagsResult.ok && tagsResult.tags && tagsResult.tags.length) {
        allTags = tagsResult.tags.slice(0, 100);
        latestTag = tagsResult.tags[0] || null;
      }
      if (latestTag) {
        try {
          const countOut = await runInDir(dirPath, 'git', ['rev-list', '--count', `${latestTag}..HEAD`]).catch(() => ({ stdout: '' }));
          const count = parseInt((countOut.stdout || '').trim(), 10);
          commitsSinceLatestTag = Number.isFinite(count) ? count : null;
        } catch (_) {}
      }
      if (remoteName) {
        const remotesResult = await getRemotes(dirPath);
        if (remotesResult.ok && remotesResult.remotes) {
          const r = remotesResult.remotes.find((x) => x.name === remoteName);
          if (r && r.url) gitRemote = r.url;
        }
      }
      if (statusShortResult.ok) {
        branch = statusShortResult.branch;
        ahead = statusShortResult.ahead;
        behind = statusShortResult.behind;
      }
      if (porcelainResult.output) {
        const { lines, conflictCount: parsedConflictCount } = parsePorcelainLines(porcelainResult.output);
        uncommittedLines = lines;
        conflictCount = parsedConflictCount;
      }
    } catch (_) {}

    return {
      latestTag,
      allTags,
      commitsSinceLatestTag,
      gitRemote,
      branch,
      ahead,
      behind,
      uncommittedLines,
      conflictCount,
    };
  }

  return { getProjectInfoFromGit };
}

module.exports = { createGitProjectInfo };
