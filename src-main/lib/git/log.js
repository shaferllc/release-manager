/**
 * Git log, commit detail, commit subject, commits since tag, recent commits.
 * @param {{ runInDir: Function, parseCommitLog: Function, parseCommitLogWithBody: Function }} deps
 */
const { getRecentCommits: getRecentCommitsLib } = require('../gitLog');

function createGitLog(deps) {
  const { runInDir, parseCommitLog, parseCommitLogWithBody } = deps;

  async function getRecentCommits(dirPath, n = 10) {
    return getRecentCommitsLib(runInDir, dirPath, n);
  }

  async function getCommitLog(dirPath, n = 30) {
    const limit = Math.max(1, Math.min(100, n));
    try {
      const out = await runInDir(dirPath, 'git', [
        'log',
        '-n',
        String(limit),
        '--pretty=format:%h%x00%s%x00%an%x00%ad%x00%ae',
        '--date=short',
        '--no-merges',
      ]);
      const commits = parseCommitLog(out.stdout || '');
      return { ok: true, commits };
    } catch (e) {
      return { ok: false, error: e.message || 'git log failed', commits: [] };
    }
  }

  async function getCommitLogWithBody(dirPath, n = 30) {
    const limit = Math.max(1, Math.min(100, n));
    try {
      const out = await runInDir(dirPath, 'git', [
        'log',
        '-n',
        String(limit),
        '--pretty=format:%h%x00%s%x00%an%x00%ad%x00%ae%x00%b%x1e',
        '--date=short',
        '--no-merges',
      ]);
      const commits = parseCommitLogWithBody(out.stdout || '');
      return { ok: true, commits };
    } catch (e) {
      return { ok: false, error: e.message || 'git log failed', commits: [] };
    }
  }

  async function getCommitDetail(dirPath, sha) {
    const s = (sha || '').trim();
    if (!s) return { ok: false, error: 'SHA required' };
    try {
      const [infoOut, diffOut, namesOut] = await Promise.all([
        runInDir(dirPath, 'git', ['show', '-s', '--format=%s%n%an%n%ad%n%b', '--date=short', s]).catch(() => ({ stdout: '' })),
        runInDir(dirPath, 'git', ['show', '--no-color', s]).catch(() => ({ stdout: '' })),
        runInDir(dirPath, 'git', ['diff-tree', '--no-commit-id', '--name-only', '-r', s]).catch(() => ({ stdout: '' })),
      ]);
      const infoLines = (infoOut.stdout || '').trim().split(/\r?\n/);
      const subject = infoLines[0] || '';
      const author = infoLines[1] || '';
      const date = infoLines[2] || '';
      const body = infoLines.slice(3).join('\n').trim();
      const diff = (diffOut.stdout || '').trim();
      const files = (namesOut.stdout || '').trim().split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      return { ok: true, sha: s, subject, author, date, body, diff, files };
    } catch (e) {
      return { ok: false, error: e.message || 'Failed to get commit' };
    }
  }

  async function getCommitSubject(dirPath, ref) {
    const r = (ref || 'HEAD').trim();
    try {
      const out = await runInDir(dirPath, 'git', ['log', '-1', '--pretty=format:%s', r]);
      return { ok: true, subject: (out.stdout || '').trim() };
    } catch (e) {
      return { ok: false, error: e.message || 'Failed to get commit', subject: '' };
    }
  }

  async function getCommitsSinceTag(dirPath, sinceTag) {
    try {
      const args = sinceTag
        ? ['log', sinceTag + '..HEAD', '--pretty=format:%s', '--no-merges']
        : ['log', '-n', '30', '--pretty=format:%s', '--no-merges'];
      const out = await runInDir(dirPath, 'git', args);
      const lines = (out.stdout || '').trim().split(/\r?\n/).filter(Boolean);
      return { ok: true, commits: lines };
    } catch (e) {
      return { ok: false, error: e.message || 'git log failed', commits: [] };
    }
  }

  return {
    getCommitLog,
    getCommitLogWithBody,
    getCommitDetail,
    getCommitSubject,
    getCommitsSinceTag,
    getRecentCommits,
  };
}

module.exports = { createGitLog };
