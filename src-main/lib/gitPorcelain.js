/**
 * Parse git status --porcelain output for uncommitted and merge-conflict detection.
 * Testable without Electron.
 */

/**
 * True if the two-character status indicates an unmerged (conflicted) file.
 * Git uses UU, AA, DD, AU, UA, DU, UD for unmerged.
 * @param {string} status - First two chars of a porcelain line (e.g. 'UU', ' M')
 * @returns {boolean}
 */
function isUnmergedStatus(status) {
  return typeof status === 'string' && status.length >= 2 && /^[UAD][UAD]$/.test(status.slice(0, 2));
}

/**
 * Parse a single git status --porcelain line into status, path, and flags.
 * @param {string} line - One line (e.g. 'UU path/to/file' or 'R  old -> new')
 * @returns {{ status: string, filePath: string, isUntracked: boolean, isUnmerged: boolean }}
 */
function parsePorcelainLine(line) {
  const status = line.length >= 2 ? line.slice(0, 2) : '';
  const filePath = line.includes(' -> ') ? line.split(' -> ')[1].trim() : (line.length > 2 ? line.slice(2).trim() : line);
  const isUntracked = status === '??' || (status.length > 0 && status[0] === '?');
  const isUnmerged = isUnmergedStatus(status);
  return { status, filePath, isUntracked, isUnmerged };
}

/**
 * Parse full porcelain output and return parsed lines plus conflict count.
 * @param {string} porcelain - Raw stdout from `git status --porcelain -uall`
 * @returns {{ lines: Array<{ status: string, filePath: string, isUntracked: boolean, isUnmerged: boolean }>, conflictCount: number }}
 */
function parsePorcelainLines(porcelain) {
  const raw = typeof porcelain === 'string' ? porcelain.trim() : '';
  const lineStrings = raw ? raw.split(/\r?\n/).filter(Boolean) : [];
  const lines = lineStrings.map(parsePorcelainLine);
  const conflictCount = lines.filter((l) => l.isUnmerged).length;
  return { lines, conflictCount };
}

module.exports = {
  isUnmergedStatus,
  parsePorcelainLine,
  parsePorcelainLines,
};
