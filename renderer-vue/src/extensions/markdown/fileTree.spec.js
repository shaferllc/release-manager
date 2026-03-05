import { describe, it, expect } from 'vitest';
import { buildFileTree } from './fileTree';

describe('fileTree', () => {
  describe('buildFileTree', () => {
    it('returns empty array for empty paths', () => {
      expect(buildFileTree([])).toEqual([]);
    });

    it('returns single file at root', () => {
      expect(buildFileTree(['README.md'])).toEqual([{ name: 'README.md', path: 'README.md' }]);
    });

    it('returns multiple files at root sorted by name', () => {
      const result = buildFileTree(['CHANGELOG.md', 'README.md', 'AUTHORS.md']);
      expect(result).toHaveLength(3);
      expect(result.map((n) => n.name)).toEqual(['AUTHORS.md', 'CHANGELOG.md', 'README.md']);
      expect(result[0]).toEqual({ name: 'AUTHORS.md', path: 'AUTHORS.md' });
    });

    it('builds one level of folders', () => {
      const result = buildFileTree(['README.md', 'docs/a.md', 'docs/b.md']);
      expect(result).toHaveLength(2); // README + docs folder
      const readme = result.find((n) => n.name === 'README.md');
      const docs = result.find((n) => n.name === 'docs');
      expect(readme).toEqual({ name: 'README.md', path: 'README.md' });
      expect(docs).toBeDefined();
      expect(docs.children).toHaveLength(2);
      expect(docs.children.map((c) => c.name).sort()).toEqual(['a.md', 'b.md']);
      expect(docs.children[0].path).toBe('docs/a.md');
    });

    it('builds nested folders', () => {
      const result = buildFileTree(['docs/guides/b.md', 'docs/guides/a.md', 'docs/readme.md']);
      expect(result).toHaveLength(1);
      const docs = result[0];
      expect(docs.name).toBe('docs');
      expect(docs.children).toHaveLength(2); // readme.md + guides folder
      const guides = docs.children.find((c) => c.name === 'guides');
      const readme = docs.children.find((c) => c.name === 'readme.md');
      expect(guides).toBeDefined();
      expect(guides.children).toHaveLength(2);
      expect(guides.children.map((c) => c.name).sort()).toEqual(['a.md', 'b.md']);
      expect(readme).toEqual({ name: 'readme.md', path: 'docs/readme.md' });
    });

    it('sorts folders before files in same directory', () => {
      const result = buildFileTree(['a.md', 'dir/file.md']);
      expect(result[0].name).toBe('dir');
      expect(result[1].name).toBe('a.md');
    });

    it('sorts sibling nodes (folders before files, then by name)', () => {
      const result = buildFileTree(['README.md', 'readme-copy.md', 'Readme-other.md']);
      expect(result).toHaveLength(3);
      expect(result.map((n) => n.name).sort()).toEqual(['README.md', 'Readme-other.md', 'readme-copy.md']);
    });

    it('handles single nested file', () => {
      const result = buildFileTree(['one/two/file.md']);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('one');
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children[0].name).toBe('two');
      expect(result[0].children[0].children).toHaveLength(1);
      expect(result[0].children[0].children[0]).toEqual({ name: 'file.md', path: 'one/two/file.md' });
    });
  });
});
