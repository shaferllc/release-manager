import { describe, it, expect } from 'vitest';
import { toPlainProjects } from './plainProjects';

describe('toPlainProjects', () => {
  it('returns empty array for non-array input', () => {
    expect(toPlainProjects(null)).toEqual([]);
    expect(toPlainProjects(undefined)).toEqual([]);
    expect(toPlainProjects('')).toEqual([]);
  });

  it('converts projects to plain objects', () => {
    const list = [
      { path: '/foo', name: 'Foo', tags: ['a'], starred: true },
    ];
    expect(toPlainProjects(list)).toEqual([
      { path: '/foo', name: 'Foo', tags: ['a'], starred: true },
    ]);
  });

  it('uses path basename when name is missing', () => {
    expect(toPlainProjects([{ path: '/a/b/myapp' }])).toEqual([
      { path: '/a/b/myapp', name: 'myapp', tags: [], starred: false },
    ]);
  });

  it('handles Windows paths', () => {
    expect(toPlainProjects([{ path: 'C:\\dev\\project' }])).toEqual([
      { path: 'C:\\dev\\project', name: 'project', tags: [], starred: false },
    ]);
  });

  it('handles null/undefined path and name', () => {
    expect(toPlainProjects([{}])).toEqual([
      { path: '', name: '', tags: [], starred: false },
    ]);
  });

  it('copies tags array', () => {
    const list = [{ path: '/x', tags: ['t1', 't2'] }];
    const result = toPlainProjects(list);
    expect(result[0].tags).toEqual(['t1', 't2']);
    expect(result[0].tags).not.toBe(list[0].tags);
  });
});
