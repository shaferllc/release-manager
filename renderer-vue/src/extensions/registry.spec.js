import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  registerDetailTabExtension,
  getDetailTabExtensions,
  getDetailTabExtension,
  registerDocSection,
  getDocSections,
} from './registry';

const mockComponent = { template: '<div>ext</div>' };

describe('extensions registry', () => {
  describe('registerDetailTabExtension', () => {
    it('registers extension and getDetailTabExtensions returns it', () => {
      const uniqueId = `test-ext-${Date.now()}`;
      registerDetailTabExtension({
        id: uniqueId,
        label: 'Test',
        component: mockComponent,
      });
      const exts = getDetailTabExtensions();
      expect(exts).toContainEqual(
        expect.objectContaining({
          id: uniqueId,
          label: 'Test',
          component: mockComponent,
        }),
      );
    });

    it('warns and skips when id, label, or component missing', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      registerDetailTabExtension({ id: 'x', label: 'X' });
      registerDetailTabExtension({ id: 'y', component: mockComponent });
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });

    it('warns on duplicate id', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const dupId = `dup-${Date.now()}`;
      registerDetailTabExtension({ id: dupId, label: 'A', component: mockComponent });
      registerDetailTabExtension({ id: dupId, label: 'B', component: mockComponent });
      expect(warn).toHaveBeenCalledWith(expect.any(String), dupId);
      warn.mockRestore();
    });
  });

  describe('getDetailTabExtension', () => {
    it('returns extension by id or null', () => {
      const findId = `find-me-${Date.now()}`;
      registerDetailTabExtension({ id: findId, label: 'Find', component: mockComponent });
      expect(getDetailTabExtension(findId)).toBeTruthy();
      expect(getDetailTabExtension(findId).id).toBe(findId);
      expect(getDetailTabExtension('nonexistent-id-xyz-123')).toBeNull();
    });
  });

  describe('registerDocSection', () => {
    it('registers doc section', () => {
      const docId = `doc-${Date.now()}`;
      registerDocSection({
        id: docId,
        title: 'Docs',
        items: [{ heading: 'H1', body: '<p>B1</p>' }],
      });
      const sections = getDocSections();
      expect(sections).toContainEqual(
        expect.objectContaining({
          id: docId,
          title: 'Docs',
          category: 'Extensions',
        }),
      );
    });

    it('warns when required fields missing', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      registerDocSection({ id: 'x' });
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });

    it('warns on duplicate doc section id', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const docId = `doc-dup-${Date.now()}`;
      registerDocSection({
        id: docId,
        title: 'First',
        items: [{ heading: 'H', body: 'B' }],
      });
      registerDocSection({
        id: docId,
        title: 'Second',
        items: [{ heading: 'H2', body: 'B2' }],
      });
      expect(warn).toHaveBeenCalledWith(expect.any(String), docId);
      warn.mockRestore();
    });
  });
});
