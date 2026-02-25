const { isUnmergedStatus, parsePorcelainLine, parsePorcelainLines } = require('../gitPorcelain');

describe('gitPorcelain', () => {
  describe('isUnmergedStatus', () => {
    it('returns true for UU (both modified)', () => {
      expect(isUnmergedStatus('UU')).toBe(true);
    });
    it('returns true for AA, DD, AU, UA, DU, UD', () => {
      expect(isUnmergedStatus('AA')).toBe(true);
      expect(isUnmergedStatus('DD')).toBe(true);
      expect(isUnmergedStatus('AU')).toBe(true);
      expect(isUnmergedStatus('UA')).toBe(true);
      expect(isUnmergedStatus('DU')).toBe(true);
      expect(isUnmergedStatus('UD')).toBe(true);
    });
    it('returns false for modified, staged, untracked', () => {
      expect(isUnmergedStatus(' M')).toBe(false);
      expect(isUnmergedStatus('M ')).toBe(false);
      expect(isUnmergedStatus('??')).toBe(false);
      expect(isUnmergedStatus('A ')).toBe(false);
      expect(isUnmergedStatus(' D')).toBe(false);
    });
    it('returns false for empty or short string', () => {
      expect(isUnmergedStatus('')).toBe(false);
      expect(isUnmergedStatus('U')).toBe(false);
    });
    it('returns false for non-string', () => {
      expect(isUnmergedStatus(null)).toBe(false);
      expect(isUnmergedStatus(undefined)).toBe(false);
    });
  });

  describe('parsePorcelainLine', () => {
    it('parses unmerged line UU', () => {
      const r = parsePorcelainLine('UU src/foo.js');
      expect(r.status).toBe('UU');
      expect(r.filePath).toBe('src/foo.js');
      expect(r.isUntracked).toBe(false);
      expect(r.isUnmerged).toBe(true);
    });
    it('parses modified line', () => {
      const r = parsePorcelainLine(' M readme.md');
      expect(r.status).toBe(' M');
      expect(r.filePath).toBe('readme.md');
      expect(r.isUntracked).toBe(false);
      expect(r.isUnmerged).toBe(false);
    });
    it('parses untracked line ??', () => {
      const r = parsePorcelainLine('?? newfile.txt');
      expect(r.status).toBe('??');
      expect(r.filePath).toBe('newfile.txt');
      expect(r.isUntracked).toBe(true);
      expect(r.isUnmerged).toBe(false);
    });
    it('parses rename line with arrow', () => {
      const r = parsePorcelainLine('R  oldname.txt -> newname.txt');
      expect(r.status).toBe('R ');
      expect(r.filePath).toBe('newname.txt');
      expect(r.isUntracked).toBe(false);
      expect(r.isUnmerged).toBe(false);
    });
    it('handles short line', () => {
      const r = parsePorcelainLine('x');
      expect(r.status).toBe('');
      expect(r.filePath).toBe('x');
    });
  });

  describe('parsePorcelainLines', () => {
    it('returns empty lines and zero conflictCount for empty string', () => {
      const { lines, conflictCount } = parsePorcelainLines('');
      expect(lines).toEqual([]);
      expect(conflictCount).toBe(0);
    });
    it('returns empty for whitespace-only', () => {
      const { lines } = parsePorcelainLines('   \n  ');
      expect(lines).toEqual([]);
    });
    it('parses multiple lines and counts conflicts', () => {
      const raw = [
        ' M modified.js',
        'UU conflicted.js',
        '?? untracked.js',
        'AU another-conflict.php',
      ].join('\n');
      const { lines, conflictCount } = parsePorcelainLines(raw);
      expect(lines).toHaveLength(4);
      expect(lines[0].filePath).toBe('modified.js');
      expect(lines[0].isUnmerged).toBe(false);
      expect(lines[1].filePath).toBe('conflicted.js');
      expect(lines[1].isUnmerged).toBe(true);
      expect(lines[2].filePath).toBe('untracked.js');
      expect(lines[2].isUntracked).toBe(true);
      expect(lines[3].filePath).toBe('another-conflict.php');
      expect(lines[3].isUnmerged).toBe(true);
      expect(conflictCount).toBe(2);
    });
    it('handles CRLF', () => {
      const { lines } = parsePorcelainLines(' M a.js\r\n M b.js');
      expect(lines).toHaveLength(2);
      expect(lines[0].filePath).toBe('a.js');
      expect(lines[1].filePath).toBe('b.js');
    });
    it('handles non-string input', () => {
      const { lines, conflictCount } = parsePorcelainLines(null);
      expect(lines).toEqual([]);
      expect(conflictCount).toBe(0);
    });
  });
});
