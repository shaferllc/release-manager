/**
 * Git diff between refs, file diff structured, revert line, get file at ref, diff for commit UI.
 * @param {{ runInDir: Function, runInDirCapture: Function, path: Object, fs: Object }} deps
 */
const { getGitDiffForCommit: getGitDiffForCommitLib } = require('../gitDiff');

function createGitDiff(deps) {
  const { runInDir, runInDirCapture, path, fs } = deps;

  async function getGitDiffForCommit(dirPath, maxLength) {
    return getGitDiffForCommitLib(runInDir, dirPath, maxLength);
  }

  async function getFileDiffRaw(dirPath, filePath) {
    try {
      const result = await runInDirCapture(dirPath, 'git', ['diff', 'HEAD', '--', filePath]);
      const content = [result.stdout, result.stderr].filter(Boolean).join('\n').trim() || '(no diff)';
      return { ok: true, diff: content };
    } catch (e) {
      return { ok: false, error: e.message || 'Diff failed', diff: '' };
    }
  }

  async function getDiffBetween(dirPath, refA, refB) {
    try {
      const out = await runInDir(dirPath, 'git', ['diff', '--stat', refA, refB]);
      const stats = (out.stdout || '').trim();
      const nameOut = await runInDir(dirPath, 'git', ['diff', '--name-only', refA, refB]);
      const files = (nameOut.stdout || '').trim().split(/\r?\n/).filter(Boolean);
      return { ok: true, files, stats };
    } catch (e) {
      return { ok: false, error: e.message || 'Diff failed', files: [], stats: '' };
    }
  }

  async function getDiffBetweenFull(dirPath, refA, refB) {
    try {
      const out = await runInDir(dirPath, 'git', ['diff', '--no-color', refA, refB]);
      return { ok: true, diff: (out.stdout || '').trim() };
    } catch (e) {
      return { ok: false, error: e.message || 'Diff failed', diff: '' };
    }
  }

  function parseUnifiedDiffToRows(diffText) {
    const rows = [];
    const lines = (diffText || '').split(/\r?\n/);
    let oldLine = 0;
    let newLine = 0;
    let inHunk = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const hunkMatch = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
      if (hunkMatch) {
        oldLine = parseInt(hunkMatch[1], 10);
        newLine = parseInt(hunkMatch[3], 10);
        inHunk = true;
        continue;
      }
      if (!inHunk) continue;
      const first = line.charAt(0);
      const content = first === '-' || first === '+' || first === ' ' ? line.slice(1) : line;
      if (first === '-') {
        rows.push({ oldLineNum: oldLine, newLineNum: null, oldContent: content, newContent: null, type: 'remove' });
        oldLine++;
      } else if (first === '+') {
        rows.push({ oldLineNum: null, newLineNum: newLine, oldContent: null, newContent: content, type: 'add' });
        newLine++;
      } else {
        rows.push({ oldLineNum: oldLine, newLineNum: newLine, oldContent: content, newContent: content, type: 'context' });
        oldLine++;
        newLine++;
      }
    }
    return rows;
  }

  async function getFileDiffStructured(dirPath, filePath, options = {}) {
    try {
      let diff = '';
      if (options.commitSha) {
        const out = await runInDir(dirPath, 'git', ['show', '--no-color', options.commitSha, '--', filePath]).catch(() => ({ stdout: '' }));
        diff = (out.stdout || '').trim();
      } else if (options.staged === true) {
        const result = await runInDirCapture(dirPath, 'git', ['diff', '--cached', 'HEAD', '--', filePath]);
        diff = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
      } else if (options.staged === false) {
        const result = await runInDirCapture(dirPath, 'git', ['diff', '--', filePath]);
        diff = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
      } else {
        const result = await runInDirCapture(dirPath, 'git', ['diff', 'HEAD', '--', filePath]);
        diff = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
        if (!diff) {
          const resultCached = await runInDirCapture(dirPath, 'git', ['diff', '--cached', 'HEAD', '--', filePath]);
          diff = [resultCached.stdout, resultCached.stderr].filter(Boolean).join('\n').trim();
        }
      }
      if (diff) {
        const rows = parseUnifiedDiffToRows(diff);
        return { ok: true, filePath, rows, diff };
      }
      if (!options.commitSha) {
        const fullPath = path.join(dirPath, filePath);
        if (fs.existsSync(fullPath)) {
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            const lines = content.split(/\r?\n/);
            const rows = lines.map((line, i) => ({
              oldLineNum: null,
              newLineNum: i + 1,
              oldContent: null,
              newContent: line,
              type: 'add',
            }));
            return { ok: true, filePath, rows, diff: '' };
          } catch (_) {}
        }
      }
      return { ok: true, filePath, rows: [], diff: '' };
    } catch (e) {
      return { ok: false, error: e.message || 'Diff failed', filePath, rows: [] };
    }
  }

  async function revertFileLine(dirPath, filePath, op, lineNum, content) {
    const fullPath = path.join(dirPath, filePath);
    if (!fs.existsSync(fullPath)) return { ok: false, error: 'File not found' };
    let text = fs.readFileSync(fullPath, 'utf8');
    const lineEnding = text.includes('\r\n') ? '\r\n' : '\n';
    const lines = text.split(/\r?\n/);
    const oneBased = Math.max(1, parseInt(lineNum, 10));
    const idx = oneBased - 1;
    if (op === 'delete') {
      if (idx < 0 || idx >= lines.length) return { ok: false, error: 'Line number out of range' };
      lines.splice(idx, 1);
    } else if (op === 'replace') {
      if (idx < 0 || idx >= lines.length) return { ok: false, error: 'Line number out of range' };
      lines[idx] = content != null ? content : '';
    } else if (op === 'insert') {
      const insertIdx = Math.max(0, Math.min(idx, lines.length));
      lines.splice(insertIdx, 0, content != null ? content : '');
    } else {
      return { ok: false, error: 'Invalid operation' };
    }
    fs.writeFileSync(fullPath, lines.join(lineEnding), 'utf8');
    return { ok: true };
  }

  async function getFileAtRef(dirPath, filePath, ref = 'HEAD') {
    try {
      const out = await runInDir(dirPath, 'git', ['show', `${ref}:${filePath}`]).catch((e) => ({ stdout: null, stderr: e?.message }));
      if (out.stdout == null) return { ok: false, error: 'File not at ref or not found', content: '' };
      return { ok: true, content: out.stdout };
    } catch (e) {
      return { ok: false, error: e?.message || 'Failed to read file at ref', content: '' };
    }
  }

  return {
    getDiffBetween,
    getDiffBetweenFull,
    parseUnifiedDiffToRows,
    getFileDiffStructured,
    getFileDiffRaw,
    getGitDiffForCommit,
    revertFileLine,
    getFileAtRef,
  };
}

module.exports = { createGitDiff };
