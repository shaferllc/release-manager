/**
 * Pure parsers for git command output. Used by main process and testable without Electron.
 */

/**
 * Parse "git stash list --pretty=format:%gd %s" output.
 * @param {string} stdout
 * @returns {{ index: string, message: string }[]}
 */
function parseStashList(stdout) {
  if (stdout == null || typeof stdout !== 'string') return [];
  const lines = stdout.trim().split(/\r?\n/).filter(Boolean);
  return lines.map((line) => {
    const match = line.match(/^(stash@\{\d+\})\s*(.*)$/);
    return {
      index: match ? match[1] : line.split(/\s/)[0] || line,
      message: match ? match[2] : line,
    };
  });
}

/**
 * Parse "git branch -r --no-color" output; filter HEAD and symbolic refs.
 * @param {string} stdout
 * @returns {string[]}
 */
function parseRemoteBranches(stdout) {
  if (stdout == null || typeof stdout !== 'string') return [];
  const lines = stdout.trim().split(/\r?\n/).filter(Boolean);
  return lines
    .map((line) => line.replace(/^\*\s*/, '').trim())
    .filter((ref) => !/^\s*origin\/HEAD\s*/.test(ref) && ref.indexOf('->') === -1);
}

const COMMIT_LOG_RECORD_SEP = '\x1e';
const BODY_MAX_LENGTH = 400;

/**
 * Parse "git log --pretty=format:%h%x00%s%x00%an%x00%ad%x00%ae" output.
 * @param {string} stdout
 * @returns {{ sha: string, subject: string, author: string, date: string, authorEmail: string }[]}
 */
function parseCommitLog(stdout) {
  if (stdout == null || typeof stdout !== 'string') return [];
  const lines = stdout.trim().split(/\r?\n/).filter(Boolean);
  return lines.map((line) => {
    const parts = line.split('\0');
    return {
      sha: parts[0] || '',
      subject: parts[1] || '',
      author: parts[2] || '',
      date: parts[3] || '',
      authorEmail: parts[4] || '',
    };
  });
}

/**
 * Parse "git log --pretty=format:...%x00%ae%x00body%x1e" output that includes email and body (for search).
 * Each record is sha%x00subject%x00author%x00date%x00email%x00body; body may contain newlines.
 * @param {string} stdout
 * @returns {{ sha: string, subject: string, author: string, date: string, authorEmail: string, body: string }[]}
 */
function parseCommitLogWithBody(stdout) {
  if (stdout == null || typeof stdout !== 'string') return [];
  const records = stdout.trim().split(COMMIT_LOG_RECORD_SEP).map((r) => r.trim()).filter(Boolean);
  return records.map((record) => {
    const parts = record.split('\0');
    const sha = parts[0] || '';
    const subject = parts[1] || '';
    const author = parts[2] || '';
    const date = parts[3] || '';
    const authorEmail = parts[4] || '';
    const bodyRaw = parts.slice(5).join('\0').replace(/\r?\n/g, ' ').trim();
    const body = bodyRaw.length > BODY_MAX_LENGTH ? bodyRaw.slice(0, BODY_MAX_LENGTH) + '…' : bodyRaw;
    return { sha, subject, author, date, authorEmail, body };
  });
}

/**
 * Parse "git remote -v" output into list of { name, url }.
 * @param {string} stdout
 * @returns {{ name: string, url: string }[]}
 */
function parseRemotes(stdout) {
  if (stdout == null || typeof stdout !== 'string') return [];
  const lines = stdout.trim().split(/\r?\n/).filter(Boolean);
  const byName = {};
  lines.forEach((line) => {
    const parts = line.split(/\s+/);
    const name = parts[0];
    const url = parts[1];
    const role = parts[2];
    if (name && url) {
      byName[name] = byName[name] || { name, url: null };
      if (role === '(fetch)') byName[name].url = url;
      else if (role === '(push)' && !byName[name].url) byName[name].url = url;
    }
  });
  return Object.values(byName).map((r) => ({ name: r.name, url: r.url || '' }));
}

/**
 * Parse "git branch --no-color" for local branch names (strip asterisk).
 * @param {string} stdout
 * @returns {string[]}
 */
function parseLocalBranches(stdout) {
  if (stdout == null || typeof stdout !== 'string') return [];
  const lines = stdout.trim().split(/\r?\n/).filter(Boolean);
  return lines.map((line) => line.replace(/^\*\s*/, '').trim());
}

module.exports = {
  parseStashList,
  parseRemoteBranches,
  parseCommitLog,
  parseCommitLogWithBody,
  parseRemotes,
  parseLocalBranches,
};
