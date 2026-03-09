import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useAgentCrewSlots } from './useAgentCrewSlots';

describe('useAgentCrewSlots', () => {
  const originalReleaseManager = globalThis.window?.releaseManager;

  beforeEach(() => {
    if (globalThis.window) {
      globalThis.window.releaseManager = {
        getPreference: vi.fn(),
      };
    }
  });

  afterEach(() => {
    if (globalThis.window) {
      globalThis.window.releaseManager = originalReleaseManager;
    }
  });

  it('returns agentSlots, runningByPath, loadSlots, setSlots', () => {
    const result = useAgentCrewSlots();
    expect(result).toHaveProperty('agentSlots');
    expect(result).toHaveProperty('runningByPath');
    expect(result).toHaveProperty('loadSlots');
    expect(result).toHaveProperty('setSlots');
  });

  it('setSlots updates agentSlots', () => {
    const { agentSlots, setSlots } = useAgentCrewSlots();
    const slots = [{ id: '1', status: 'running', workspacePath: '/foo' }];
    setSlots(slots);
    expect(agentSlots.value).toEqual(slots);
  });

  it('setSlots ignores non-array', () => {
    const { agentSlots, setSlots } = useAgentCrewSlots();
    setSlots([{ id: '1' }]);
    setSlots(null);
    expect(agentSlots.value).toEqual([{ id: '1' }]);
  });

  it('runningByPath groups running slots by workspacePath', () => {
    const { agentSlots, setSlots, runningByPath } = useAgentCrewSlots();
    setSlots([
      { id: '1', status: 'running', workspacePath: '/foo' },
      { id: '2', status: 'running', workspacePath: '/foo' },
      { id: '3', status: 'running', workspacePath: '/bar' },
      { id: '4', status: 'idle', workspacePath: '/foo' },
    ]);
    const byPath = runningByPath.value;
    expect(byPath.get('/foo')).toHaveLength(2);
    expect(byPath.get('/bar')).toHaveLength(1);
  });

  it('loadSlots loads from getPreference', async () => {
    const api = globalThis.window?.releaseManager;
    api.getPreference.mockResolvedValue(JSON.stringify([{ id: 'x', status: 'idle' }]));
    const { agentSlots, loadSlots } = useAgentCrewSlots();
    await loadSlots();
    expect(agentSlots.value).toHaveLength(1);
    expect(agentSlots.value[0].id).toBe('x');
  });

  it('loadSlots does not throw when getPreference missing', async () => {
    const prev = globalThis.window?.releaseManager;
    if (globalThis.window) globalThis.window.releaseManager = {};
    const { loadSlots } = useAgentCrewSlots();
    await expect(loadSlots()).resolves.toBeUndefined();
    if (globalThis.window) globalThis.window.releaseManager = prev;
  });
});
