import { describe, it, expect } from 'vitest';
import { getDetailTabExtension, getDetailTabExtensions } from '../registry';

import './index.js';

describe('Runbooks extension', () => {
  it('registers a detail-tab extension with id "runbooks"', () => {
    const ext = getDetailTabExtension('runbooks');
    expect(ext).toBeDefined();
    expect(ext.id).toBe('runbooks');
  });

  it('has label "Runbooks"', () => {
    const ext = getDetailTabExtension('runbooks');
    expect(ext.label).toBe('Runbooks');
  });

  it('has a non-empty description', () => {
    const ext = getDetailTabExtension('runbooks');
    expect(ext.description).toBeDefined();
    expect(typeof ext.description).toBe('string');
    expect(ext.description.length).toBeGreaterThan(0);
  });

  it('has a version string', () => {
    const ext = getDetailTabExtension('runbooks');
    expect(ext.version).toBeDefined();
    expect(ext.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('has an icon (SVG string)', () => {
    const ext = getDetailTabExtension('runbooks');
    expect(ext.icon).toBeDefined();
    expect(ext.icon).toContain('<svg');
    expect(ext.icon).toContain('</svg>');
  });

  it('has a Vue component', () => {
    const ext = getDetailTabExtension('runbooks');
    expect(ext.component).toBeDefined();
    expect(typeof ext.component).toBe('object');
  });

  it('is included in getDetailTabExtensions()', () => {
    const all = getDetailTabExtensions();
    const runbooks = all.find((e) => e.id === 'runbooks');
    expect(runbooks).toBeDefined();
    expect(runbooks?.label).toBe('Runbooks');
  });
});
