/**
 * Git log helpers: parse output and fetch recent commit subjects. Testable without Electron.
 */

function parseGitLogOutput(stdout) {
  if (stdout == null || typeof stdout !== 'string') return [];
  return stdout
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

async function getRecentCommits(runInDir, dirPath, n = 10) {
  const limit = Math.max(1, Math.min(50, n));
  try {
    const out = await runInDir(dirPath, 'git', [
      'log',
      '-n',
      String(limit),
      '--pretty=format:%s',
      '--no-merges',
    ]);
    const commits = parseGitLogOutput(out.stdout);
    return { ok: true, commits };
  } catch (e) {
    return { ok: false, error: e.message || 'git log failed', commits: [] };
  }
}

module.exports = { parseGitLogOutput, getRecentCommits };
