import { describe, it, expect } from 'vitest';
import { getDetailTabExtension, getDetailTabExtensions } from '../registry';

import './index.js';

describe('Changelog draft extension', () => {
  it('registers a detail-tab extension with id "changelog-draft"', () => {
    const ext = getDetailTabExtension('changelog-draft');
    expect(ext).toBeDefined();
    expect(ext.id).toBe('changelog-draft');
  });

  it('has label "Changelog draft"', () => {
    const ext = getDetailTabExtension('changelog-draft');
    expect(ext.label).toBe('Changelog draft');
  });

  it('has a non-empty description', () => {
    const ext = getDetailTabExtension('changelog-draft');
    expect(ext.description).toBeDefined();
    expect(typeof ext.description).toBe('string');
    expect(ext.description.length).toBeGreaterThan(0);
  });

  it('has a version string', () => {
    const ext = getDetailTabExtension('changelog-draft');
    expect(ext.version).toBeDefined();
    expect(ext.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('has an icon (SVG string)', () => {
    const ext = getDetailTabExtension('changelog-draft');
    expect(ext.icon).toBeDefined();
    expect(ext.icon).toContain('<svg');
    expect(ext.icon).toContain('</svg>');
  });

  it('has a Vue component', () => {
    const ext = getDetailTabExtension('changelog-draft');
    expect(ext.component).toBeDefined();
    expect(typeof ext.component).toBe('object');
  });

  it('is included in getDetailTabExtensions()', () => {
    const all = getDetailTabExtensions();
    const ext = all.find((e) => e.id === 'changelog-draft');
    expect(ext).toBeDefined();
    expect(ext?.label).toBe('Changelog draft');
  });
});
