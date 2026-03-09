const {
  getApiDocs,
  getApiMethodDoc,
  getSampleResponseForMethod,
  API_DOCS,
} = require('../apiDocs');

describe('apiDocs', () => {
  describe('getApiDocs', () => {
    it('returns the full API_DOCS array', () => {
      const docs = getApiDocs();
      expect(Array.isArray(docs)).toBe(true);
      expect(docs).toBe(API_DOCS);
      expect(docs.length).toBeGreaterThan(50);
    });

    it('every entry has name and description', () => {
      const docs = getApiDocs();
      docs.forEach((d, i) => {
        expect(d).toHaveProperty('name');
        expect(typeof d.name).toBe('string');
        expect(d.name.length).toBeGreaterThan(0);
        expect(d).toHaveProperty('description');
        expect(typeof d.description).toBe('string');
      });
    });

    it('every entry has category from known set', () => {
      const docs = getApiDocs();
      const categories = new Set(docs.map((d) => d.category).filter(Boolean));
      expect(categories.size).toBeGreaterThan(0);
      docs.forEach((d) => {
        if (d.category) expect(typeof d.category).toBe('string');
      });
    });

    it('params when present is array of { name, type? }', () => {
      const docs = getApiDocs();
      docs.forEach((d) => {
        if (d.params) {
          expect(Array.isArray(d.params)).toBe(true);
          d.params.forEach((p) => {
            expect(p).toHaveProperty('name');
            expect(typeof p.name).toBe('string');
          });
        }
      });
    });

    it('contains expected meta methods', () => {
      const docs = getApiDocs();
      const names = docs.map((d) => d.name);
      expect(names).toContain('getApiDocs');
      expect(names).toContain('getApiMethodDoc');
      expect(names).toContain('getSampleResponse');
      expect(names).toContain('listApiMethods');
      expect(names).toContain('getProjects');
      expect(names).toContain('getAllProjectsInfo');
    });
  });

  describe('getApiMethodDoc', () => {
    it('returns doc for existing method', () => {
      const doc = getApiMethodDoc('getProjects');
      expect(doc).not.toBeNull();
      expect(doc.name).toBe('getProjects');
      expect(doc.description).toContain('project');
    });

    it('returns doc for getApiDocs', () => {
      const doc = getApiMethodDoc('getApiDocs');
      expect(doc).not.toBeNull();
      expect(doc.name).toBe('getApiDocs');
    });

    it('returns doc for getSampleResponse', () => {
      const doc = getApiMethodDoc('getSampleResponse');
      expect(doc).not.toBeNull();
      expect(doc.name).toBe('getSampleResponse');
      expect(doc.params).toEqual([
        {
          name: 'methodName',
          type: 'string',
          description: expect.any(String),
        },
      ]);
    });

    it('returns null for unknown method', () => {
      expect(getApiMethodDoc('nonExistentMethod')).toBeNull();
      expect(getApiMethodDoc('')).toBeNull();
    });

    it('returns null for undefined/null', () => {
      expect(getApiMethodDoc(undefined)).toBeNull();
      expect(getApiMethodDoc(null)).toBeNull();
    });
  });

  describe('getSampleResponseForMethod', () => {
    it('returns parsed result for getProjects', () => {
      const result = getSampleResponseForMethod('getProjects');
      expect(result).not.toBeNull();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        path: '/Users/me/projects/my-app',
        name: 'my-app',
        tags: [],
        starred: false,
      });
    });

    it('returns parsed result for getAllProjectsInfo', () => {
      const result = getSampleResponseForMethod('getAllProjectsInfo');
      expect(result).not.toBeNull();
      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toMatchObject({
        path: '/Users/me/projects/my-app',
        name: 'my-app',
        type: 'npm',
        version: '1.2.0',
        git: { branch: 'main', clean: true, ahead: 0, behind: 0 },
      });
    });

    it('returns parsed result for getBranches', () => {
      const result = getSampleResponseForMethod('getBranches');
      expect(result).not.toBeNull();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual(['main', 'develop', 'feature/add-api-docs']);
    });

    it('returns parsed result for getGitStatus', () => {
      const result = getSampleResponseForMethod('getGitStatus');
      expect(result).not.toBeNull();
      expect(result).toMatchObject({
        branch: 'main',
        clean: false,
        ahead: 2,
        behind: 0,
      });
    });

    it('returns null for method with no sampleResponse', () => {
      expect(getSampleResponseForMethod('setProjects')).toBeNull();
      expect(getSampleResponseForMethod('getApiDocs')).toBeNull();
    });

    it('returns null for unknown method', () => {
      expect(getSampleResponseForMethod('nonExistent')).toBeNull();
    });

    it('returns null for empty or invalid method name', () => {
      expect(getSampleResponseForMethod('')).toBeNull();
    });
  });
});
