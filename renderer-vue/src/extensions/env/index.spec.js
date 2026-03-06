import { describe, it, expect } from 'vitest';
import { getDetailTabExtension, getDetailTabExtensions } from '../registry';

import './index.js';

describe('Env (environment / .env) extension', () => {
  it('registers a detail-tab extension with id "env"', () => {
    const ext = getDetailTabExtension('env');
    expect(ext).toBeDefined();
    expect(ext.id).toBe('env');
  });

  it('has label "Environment"', () => {
    const ext = getDetailTabExtension('env');
    expect(ext.label).toBe('Environment');
  });

  it('has isVisible that returns true for npm and php', () => {
    const ext = getDetailTabExtension('env');
    expect(ext.isVisible).toBeDefined();
    expect(typeof ext.isVisible).toBe('function');
    expect(ext.isVisible({ projectType: 'npm' })).toBe(true);
    expect(ext.isVisible({ projectType: 'NPM' })).toBe(true);
    expect(ext.isVisible({ projectType: 'php' })).toBe(true);
    expect(ext.isVisible({ projectType: 'PHP' })).toBe(true);
  });

  it('has isVisible that returns false for other project types', () => {
    const ext = getDetailTabExtension('env');
    expect(ext.isVisible({ projectType: 'python' })).toBe(false);
    expect(ext.isVisible({ projectType: '' })).toBe(false);
    expect(ext.isVisible({})).toBe(false);
  });

  it('has a Vue component', () => {
    const ext = getDetailTabExtension('env');
    expect(ext.component).toBeDefined();
    expect(typeof ext.component).toBe('object');
  });

  it('is included in getDetailTabExtensions()', () => {
    const all = getDetailTabExtensions();
    const env = all.find((e) => e.id === 'env');
    expect(env).toBeDefined();
    expect(env?.label).toBe('Environment');
  });
});
