import { describe, it, expect } from 'vitest';
import {
  getGitPanelPlugins,
  getGitPanelPlugin,
  GIT_PANEL_POSITION_PREFERENCE_KEY,
  GIT_PANEL_CONFIG_PREFERENCE_KEY,
  POSITION_OPTIONS,
} from './registry';

describe('gitPanels registry', () => {
  describe('getGitPanelPlugins', () => {
    it('returns array of plugins with id, label, icon, defaultPosition', () => {
      const plugins = getGitPanelPlugins();
      expect(Array.isArray(plugins)).toBe(true);
      expect(plugins.length).toBeGreaterThan(0);
      const first = plugins[0];
      expect(first).toHaveProperty('id');
      expect(first).toHaveProperty('label');
      expect(first).toHaveProperty('icon');
      expect(first).toHaveProperty('defaultPosition');
    });

    it('includes known panel ids', () => {
      const plugins = getGitPanelPlugins();
      const ids = plugins.map((p) => p.id);
      expect(ids).toContain('working-tree');
      expect(ids).toContain('branch-sync');
      expect(ids).toContain('stash');
    });
  });

  describe('getGitPanelPlugin', () => {
    it('returns plugin by id', () => {
      const plugin = getGitPanelPlugin('working-tree');
      expect(plugin).toBeTruthy();
      expect(plugin.id).toBe('working-tree');
    });

    it('returns undefined for unknown id', () => {
      expect(getGitPanelPlugin('nonexistent-id-xyz')).toBeUndefined();
    });
  });

  describe('constants', () => {
    it('exports preference keys', () => {
      expect(GIT_PANEL_POSITION_PREFERENCE_KEY).toBe('gitPanelPositions');
      expect(GIT_PANEL_CONFIG_PREFERENCE_KEY).toBe('gitPanelConfig');
    });

    it('exports POSITION_OPTIONS', () => {
      expect(POSITION_OPTIONS).toContainEqual({ value: 'left', label: 'Left' });
      expect(POSITION_OPTIONS).toContainEqual({ value: 'center', label: 'Center' });
      expect(POSITION_OPTIONS).toContainEqual({ value: 'right', label: 'Right' });
    });
  });
});
