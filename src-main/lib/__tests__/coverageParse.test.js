const { parseCoverageSummary } = require('../coverageParse');

describe('coverageParse', () => {
  describe('parseCoverageSummary', () => {
    it('returns null for empty or non-string', () => {
      expect(parseCoverageSummary('')).toBeNull();
      expect(parseCoverageSummary(null)).toBeNull();
      expect(parseCoverageSummary(undefined)).toBeNull();
      expect(parseCoverageSummary(123)).toBeNull();
    });

    it('parses Jest/Vitest "All files" line', () => {
      const out = [
        'File      | % Stmts | % Branch | % Funcs | % Lines',
        'All files |   85.71 |    62.5  |   80    |  85.71',
      ].join('\n');
      expect(parseCoverageSummary(out)).toBe('85.71%');
    });

    it('parses Statements line', () => {
      expect(parseCoverageSummary('Statements : 87.5% (7/8)')).toBe('Stmts 87.5%');
      expect(parseCoverageSummary('Statements : 100 (10/10)')).toBe('Stmts 100%');
    });

    it('parses Lines line', () => {
      expect(parseCoverageSummary('Lines   : 85.71% (6/7)')).toBe('Lines 85.71%');
    });

    it('parses PHPUnit "Code Coverage"', () => {
      expect(parseCoverageSummary('Code Coverage: 87.50%')).toBe('87.50%');
      expect(parseCoverageSummary('Summary:\n  Code Coverage: 92.31%')).toBe('92.31%');
    });

    it('parses PHPUnit "Lines:" line', () => {
      expect(parseCoverageSummary('  Lines: 85.71%')).toBe('Lines 85.71%');
    });

    it('parses generic "Coverage: X%"', () => {
      expect(parseCoverageSummary('Coverage: 78.5%')).toBe('78.5%');
      expect(parseCoverageSummary('coverage: 90%')).toBe('90%');
    });

    it('parses generic "X% coverage"', () => {
      expect(parseCoverageSummary('Total: 88.25% coverage')).toBe('88.25%');
    });

    it('returns first match when multiple patterns exist', () => {
      const out = 'All files | 90 | 80\nStatements : 85%';
      expect(parseCoverageSummary(out)).toBe('90%');
    });

    it('returns null when no pattern matches', () => {
      expect(parseCoverageSummary('no numbers here')).toBeNull();
      expect(parseCoverageSummary('Tests: 5 passed')).toBeNull();
    });

    it('matches in second loop when first loop has no match (PHPUnit Lines)', () => {
      const out = 'Some header\n  Lines: 75%\nFooter';
      expect(parseCoverageSummary(out)).toBe('Lines 75%');
    });

    it('matches second generic pattern (X% coverage) when first generic fails', () => {
      const out = 'Summary: 66.67% coverage';
      expect(parseCoverageSummary(out)).toBe('66.67%');
    });

    it('reaches generic return after both loops run without matching', () => {
      const out = 'Report\nDetails\nCoverage: 42%';
      expect(parseCoverageSummary(out)).toBe('42%');
    });
  });
});
