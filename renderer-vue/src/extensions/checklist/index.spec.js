import { describe, it, expect } from 'vitest';
import { getDetailTabExtension, getDetailTabExtensions } from '../registry';

import './index.js';

describe('Checklist (release checklist) extension', () => {
  it('registers a detail-tab extension with id "checklist"', () => {
    const ext = getDetailTabExtension('checklist');
    expect(ext).toBeDefined();
    expect(ext.id).toBe('checklist');
  });

  it('has label "Release checklist"', () => {
    const ext = getDetailTabExtension('checklist');
    expect(ext.label).toBe('Release checklist');
  });

  it('has a non-empty description', () => {
    const ext = getDetailTabExtension('checklist');
    expect(ext.description).toBeDefined();
    expect(typeof ext.description).toBe('string');
    expect(ext.description.length).toBeGreaterThan(0);
  });

  it('has a version string', () => {
    const ext = getDetailTabExtension('checklist');
    expect(ext.version).toBeDefined();
    expect(ext.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('has an icon (SVG string)', () => {
    const ext = getDetailTabExtension('checklist');
    expect(ext.icon).toBeDefined();
    expect(ext.icon).toContain('<svg');
    expect(ext.icon).toContain('</svg>');
  });

  it('has a Vue component', () => {
    const ext = getDetailTabExtension('checklist');
    expect(ext.component).toBeDefined();
    expect(typeof ext.component).toBe('object');
  });

  it('is included in getDetailTabExtensions()', () => {
    const all = getDetailTabExtensions();
    const checklist = all.find((e) => e.id === 'checklist');
    expect(checklist).toBeDefined();
    expect(checklist?.label).toBe('Release checklist');
  });
});
