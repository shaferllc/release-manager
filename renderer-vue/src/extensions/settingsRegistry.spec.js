import { describe, it, expect, vi } from 'vitest';
import {
  registerSettingsSection,
  getSettingsSections,
} from './settingsRegistry';

const mockComponent = { template: '<div>settings</div>' };

describe('settingsRegistry', () => {
  describe('registerSettingsSection', () => {
    it('registers section and getSettingsSections returns it', () => {
      const uniqueId = `test-settings-${Date.now()}`;
      registerSettingsSection({
        id: uniqueId,
        label: 'Test Settings',
        component: mockComponent,
      });
      const sections = getSettingsSections();
      expect(sections).toContainEqual(
        expect.objectContaining({
          id: uniqueId,
          label: 'Test Settings',
          component: mockComponent,
        }),
      );
    });

    it('warns and skips when id, label, or component missing', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      registerSettingsSection({ id: 'x', label: 'X' });
      registerSettingsSection({ id: 'y', component: mockComponent });
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });

    it('warns on duplicate id', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const dupId = `dup-settings-${Date.now()}`;
      registerSettingsSection({ id: dupId, label: 'A', component: mockComponent });
      registerSettingsSection({ id: dupId, label: 'B', component: mockComponent });
      expect(warn).toHaveBeenCalledWith(expect.any(String), dupId);
      warn.mockRestore();
    });

    it('uses empty string for icon when not provided', () => {
      const uniqueId = `icon-test-${Date.now()}`;
      registerSettingsSection({
        id: uniqueId,
        label: 'No Icon',
        component: mockComponent,
      });
      const sections = getSettingsSections();
      const found = sections.find((s) => s.id === uniqueId);
      expect(found.icon).toBe('');
    });
  });
});
