import { describe, it, expect } from 'vitest';
import { useTerminalPanel } from './useTerminalPanel';

describe('useTerminalPanel', () => {
  const mockStore = { selectedPath: '/foo/bar' };

  it('returns tabs, activeTabId, activeTab, addTab, closeTab, etc.', () => {
    const result = useTerminalPanel(mockStore, () => '');
    expect(result).toHaveProperty('tabs');
    expect(result).toHaveProperty('activeTabId');
    expect(result).toHaveProperty('activeTab');
    expect(result).toHaveProperty('addTab');
    expect(result).toHaveProperty('closeTab');
    expect(result).toHaveProperty('ensureTabs');
  });

  it('ensureTabs creates initial tab when empty', () => {
    const store = { selectedPath: '/project' };
    const { tabs, ensureTabs } = useTerminalPanel(store, () => '');
    expect(tabs.value.length).toBeGreaterThanOrEqual(1);
    expect(tabs.value[0].dirPath).toBeTruthy();
    expect(tabs.value[0].label).toBeTruthy();
  });

  it('addTab adds new tab', () => {
    const { tabs, addTab } = useTerminalPanel(mockStore, () => '');
    const len = tabs.value.length;
    addTab();
    expect(tabs.value.length).toBe(len + 1);
  });

  it('closeTab removes tab', () => {
    const { tabs, activeTabId, addTab, closeTab } = useTerminalPanel(mockStore, () => '');
    addTab();
    const id = tabs.value[tabs.value.length - 1].id;
    closeTab(id);
    expect(tabs.value.find((t) => t.id === id)).toBeUndefined();
  });

  it('dirToLabel uses last path segment', () => {
    const store = { selectedPath: '/a/b/myproject' };
    const { tabs } = useTerminalPanel(store, () => '/a/b/myproject');
    expect(tabs.value[0].label).toBe('myproject');
  });
});
