import { describe, it, expect } from 'vitest';
import { getDetailTabExtension, getDetailTabExtensions } from '../registry';

// Import the extension so it registers itself
import './index.js';

describe('Kanban extension', () => {
  it('registers a detail-tab extension with id "kanban"', () => {
    const ext = getDetailTabExtension('kanban');
    expect(ext).toBeDefined();
    expect(ext.id).toBe('kanban');
  });

  it('has label "Kanban"', () => {
    const ext = getDetailTabExtension('kanban');
    expect(ext.label).toBe('Kanban');
  });

  it('has a non-empty description', () => {
    const ext = getDetailTabExtension('kanban');
    expect(ext.description).toBeDefined();
    expect(typeof ext.description).toBe('string');
    expect(ext.description.length).toBeGreaterThan(0);
  });

  it('has a version string', () => {
    const ext = getDetailTabExtension('kanban');
    expect(ext.version).toBeDefined();
    expect(ext.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('has an icon (SVG string)', () => {
    const ext = getDetailTabExtension('kanban');
    expect(ext.icon).toBeDefined();
    expect(ext.icon).toContain('<svg');
    expect(ext.icon).toContain('</svg>');
  });

  it('has a Vue component', () => {
    const ext = getDetailTabExtension('kanban');
    expect(ext.component).toBeDefined();
    expect(typeof ext.component).toBe('object');
  });

  it('is included in getDetailTabExtensions()', () => {
    const all = getDetailTabExtensions();
    const kanban = all.find((e) => e.id === 'kanban');
    expect(kanban).toBeDefined();
    expect(kanban?.label).toBe('Kanban');
  });

  it('has featureFlagId "kanban" for feature gating', () => {
    const ext = getDetailTabExtension('kanban');
    expect(ext.featureFlagId).toBe('kanban');
  });
});
