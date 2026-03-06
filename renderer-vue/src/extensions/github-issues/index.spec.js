import { describe, it, expect } from 'vitest';
import { getDetailTabExtension, getDetailTabExtensions } from '../registry';

import './index.js';

describe('GitHub Issues extension', () => {
  it('registers a detail-tab extension with id "github-issues"', () => {
    const ext = getDetailTabExtension('github-issues');
    expect(ext).toBeDefined();
    expect(ext.id).toBe('github-issues');
  });

  it('has label "GitHub Issues"', () => {
    const ext = getDetailTabExtension('github-issues');
    expect(ext.label).toBe('GitHub Issues');
  });

  it('has isVisible that returns true for GitHub remotes', () => {
    const ext = getDetailTabExtension('github-issues');
    expect(ext.isVisible).toBeDefined();
    expect(typeof ext.isVisible).toBe('function');
    expect(ext.isVisible({ gitRemote: 'https://github.com/owner/repo.git' })).toBe(true);
    expect(ext.isVisible({ gitRemote: 'https://github.com/owner/repo' })).toBe(true);
    expect(ext.isVisible({ gitRemote: 'git@github.com:owner/repo.git' })).toBe(true);
  });

  it('has isVisible that returns false when not GitHub', () => {
    const ext = getDetailTabExtension('github-issues');
    expect(ext.isVisible({ gitRemote: 'https://gitlab.com/owner/repo' })).toBe(false);
    expect(ext.isVisible({ gitRemote: '' })).toBe(false);
    expect(ext.isVisible({})).toBe(false);
  });

  it('has a Vue component', () => {
    const ext = getDetailTabExtension('github-issues');
    expect(ext.component).toBeDefined();
    expect(typeof ext.component).toBe('object');
  });

  it('is included in getDetailTabExtensions()', () => {
    const all = getDetailTabExtensions();
    const ext = all.find((e) => e.id === 'github-issues');
    expect(ext).toBeDefined();
    expect(ext?.label).toBe('GitHub Issues');
  });
});
