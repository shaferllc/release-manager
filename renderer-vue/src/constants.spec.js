import { describe, it, expect } from 'vitest';
import {
  VIEW_LABELS,
  PREF_DETAIL_USE_TABS,
  PREF_COLLAPSED_SECTIONS,
  GIT_ACTION_CONFIRMS,
  GIT_ACTION_SUCCESS,
} from './constants';

describe('constants', () => {
  it('exports VIEW_LABELS', () => {
    expect(VIEW_LABELS.detail).toBe('Project');
    expect(VIEW_LABELS.dashboard).toBe('Dashboard');
    expect(VIEW_LABELS.settings).toBe('Settings');
    expect(VIEW_LABELS.docs).toBe('Documentation');
    expect(VIEW_LABELS.changelog).toBe('Changelog');
  });

  it('exports preference keys', () => {
    expect(PREF_DETAIL_USE_TABS).toBe('detailUseTabs');
    expect(PREF_COLLAPSED_SECTIONS).toBe('collapsedSections');
  });

  it('exports GIT_ACTION_CONFIRMS', () => {
    expect(GIT_ACTION_CONFIRMS.pull).toContain('Pull');
    expect(GIT_ACTION_CONFIRMS.push).toContain('Push');
    expect(GIT_ACTION_CONFIRMS.forcePush).toContain('Force push');
  });

  it('exports GIT_ACTION_SUCCESS', () => {
    expect(GIT_ACTION_SUCCESS.pull).toContain('Pulled');
    expect(GIT_ACTION_SUCCESS.stash).toContain('stashed');
  });
});
