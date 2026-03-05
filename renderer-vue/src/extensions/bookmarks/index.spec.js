import { describe, it, expect } from 'vitest';
import { getDetailTabExtension, getDetailTabExtensions } from '../registry';

import './index.js';

describe('Bookmarks extension', () => {
  it('registers a detail-tab extension with id "bookmarks"', () => {
    const ext = getDetailTabExtension('bookmarks');
    expect(ext).toBeDefined();
    expect(ext.id).toBe('bookmarks');
  });

  it('has label "Bookmarks"', () => {
    const ext = getDetailTabExtension('bookmarks');
    expect(ext.label).toBe('Bookmarks');
  });

  it('has a non-empty description', () => {
    const ext = getDetailTabExtension('bookmarks');
    expect(ext.description).toBeDefined();
    expect(typeof ext.description).toBe('string');
    expect(ext.description.length).toBeGreaterThan(0);
  });

  it('has a version string', () => {
    const ext = getDetailTabExtension('bookmarks');
    expect(ext.version).toBeDefined();
    expect(ext.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('has an icon (SVG string)', () => {
    const ext = getDetailTabExtension('bookmarks');
    expect(ext.icon).toBeDefined();
    expect(ext.icon).toContain('<svg');
    expect(ext.icon).toContain('</svg>');
  });

  it('has a Vue component', () => {
    const ext = getDetailTabExtension('bookmarks');
    expect(ext.component).toBeDefined();
    expect(typeof ext.component).toBe('object');
  });

  it('is included in getDetailTabExtensions()', () => {
    const all = getDetailTabExtensions();
    const bookmarks = all.find((e) => e.id === 'bookmarks');
    expect(bookmarks).toBeDefined();
    expect(bookmarks?.label).toBe('Bookmarks');
  });
});
