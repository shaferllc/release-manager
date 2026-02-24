/**
 * Get git diff (or status) summary for use in commit message generation. Testable without Electron.
 */

const DEFAULT_MAX_LENGTH = 8000;

/**
 * Get combined staged + unstaged diff, or status --short, truncated.
 * @param {Function} runInDir - (dirPath, cmd, args) => Promise<{ stdout }>
 * @param {string} dirPath
 * @param {number} [maxLength]
 * @returns {Promise<string>}
 */
async function getGitDiffForCommit(runInDir, dirPath, maxLength = DEFAULT_MAX_LENGTH) {
  let combined = '';
  try {
    const [staged, unstaged] = await Promise.all([
      runInDir(dirPath, 'git', ['diff', '--cached']).then((o) => (o.stdout || '').trim()).catch(() => ''),
      runInDir(dirPath, 'git', ['diff']).then((o) => (o.stdout || '').trim()).catch(() => ''),
    ]);
    combined = [staged, unstaged].filter(Boolean).join('\n---\n');
  } catch (_) {}
  if (!combined.trim()) {
    try {
      const out = await runInDir(dirPath, 'git', ['status', '--short']);
      combined = (out.stdout || '').trim() || 'No changes';
    } catch (_) {
      combined = 'No changes';
    }
  }
  return combined.slice(0, maxLength);
}

module.exports = { getGitDiffForCommit, DEFAULT_MAX_LENGTH };
