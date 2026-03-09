import { describe, it, expect } from 'vitest';
import './index.js';
import { getDetailTabExtensions } from '../registry';

describe('codeseer extension', () => {
  it('registers codeseer detail tab', () => {
    const extensions = getDetailTabExtensions();
    const codeseer = extensions.find((e) => e.id === 'codeseer');
    expect(codeseer).toBeDefined();
    expect(codeseer.label).toBe('CodeSeer');
    expect(codeseer.description).toContain('PHP debugging');
    expect(codeseer.component).toBeDefined();
  });
});
