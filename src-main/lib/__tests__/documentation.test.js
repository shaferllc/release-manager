const {
  DOC_SECTION_TITLES,
  DOC_FEATURE_KEYS,
  docHasRequiredSections,
  docHasRequiredFeatures,
} = require('../documentation');

describe('documentation', () => {
  describe('DOC_SECTION_TITLES', () => {
    it('has at least 5 sections', () => {
      expect(DOC_SECTION_TITLES.length).toBeGreaterThanOrEqual(5);
    });

    it('includes Overview, Adding projects, Settings, Theme', () => {
      expect(DOC_SECTION_TITLES).toContain('Overview');
      expect(DOC_SECTION_TITLES).toContain('Adding projects');
      expect(DOC_SECTION_TITLES).toContain('Settings');
      expect(DOC_SECTION_TITLES).toContain('Theme');
    });

    it('has no duplicate titles', () => {
      const set = new Set(DOC_SECTION_TITLES);
      expect(set.size).toBe(DOC_SECTION_TITLES.length);
    });
  });

  describe('DOC_FEATURE_KEYS', () => {
    it('includes npm, Rust, Go, Python', () => {
      expect(DOC_FEATURE_KEYS).toContain('npm');
      expect(DOC_FEATURE_KEYS).toContain('Rust');
      expect(DOC_FEATURE_KEYS).toContain('Go');
      expect(DOC_FEATURE_KEYS).toContain('Python');
    });

    it('includes Documentation', () => {
      expect(DOC_FEATURE_KEYS).toContain('Documentation');
    });
  });

  describe('docHasRequiredSections', () => {
    it('returns ok true when html contains all section titles', () => {
      const html = DOC_SECTION_TITLES.map((t) => `<h3>${t}</h3>`).join('\n');
      const result = docHasRequiredSections(html);
      expect(result.ok).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('returns ok false and missing list when a title is absent', () => {
      const html = '<h3>Overview</h3><h3>Settings</h3>';
      const result = docHasRequiredSections(html);
      expect(result.ok).toBe(false);
      expect(result.missing).toContain('Adding projects');
      expect(result.missing.length).toBeGreaterThan(0);
    });

    it('returns ok false for empty or non-string', () => {
      expect(docHasRequiredSections('').ok).toBe(false);
      expect(docHasRequiredSections(null).ok).toBe(false);
      expect(docHasRequiredSections(null).missing.length).toBe(DOC_SECTION_TITLES.length);
    });
  });

  describe('docHasRequiredFeatures', () => {
    it('returns ok false when docs-view is missing', () => {
      const html = DOC_FEATURE_KEYS.join(' ');
      const result = docHasRequiredFeatures(html);
      expect(result.ok).toBe(false);
      expect(result.missing).toContain('docs-view');
    });

    it('returns ok true when view and all feature keys present', () => {
      const html = '<div id="docs-view"><div class="docs-content">' + DOC_FEATURE_KEYS.join(' ') + '</div></div>';
      const result = docHasRequiredFeatures(html);
      expect(result.ok).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('returns ok false for empty or non-string', () => {
      expect(docHasRequiredFeatures('').ok).toBe(false);
      expect(docHasRequiredFeatures(null).ok).toBe(false);
    });

    it('returns ok false and missing when a feature key is absent', () => {
      const html = '<div id="docs-view"><div class="docs-content">npm Rust Go</div></div>';
      const result = docHasRequiredFeatures(html);
      expect(result.ok).toBe(false);
      expect(result.missing.length).toBeGreaterThan(0);
    });
  });

});
