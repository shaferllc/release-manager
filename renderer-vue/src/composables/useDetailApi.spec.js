import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useDetailApi } from './useDetailApi';

describe('useDetailApi', () => {
  const originalReleaseManager = globalThis.window?.releaseManager;

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    if (globalThis.window) {
      globalThis.window.releaseManager = {
        getProjectInfo: vi.fn(),
        getGitStatus: vi.fn(),
        runProjectTests: vi.fn(),
        runProjectCoverage: vi.fn(),
        release: vi.fn(),
        invokeApi: vi.fn(),
      };
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (globalThis.window) {
      globalThis.window.releaseManager = originalReleaseManager;
    }
  });

  it('returns methodOptions, methodName, paramsText, busy, error, projectPath, callApi, etc.', () => {
    const result = useDetailApi();
    expect(result).toHaveProperty('methodOptions');
    expect(result).toHaveProperty('methodName');
    expect(result).toHaveProperty('paramsText');
    expect(result).toHaveProperty('busy');
    expect(result).toHaveProperty('error');
    expect(result).toHaveProperty('projectPath');
    expect(result).toHaveProperty('callApi');
  });

  it('callApi sets error when no project selected', async () => {
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    store.selectedPath = '';
    store.selectedProject = null;

    const { error, callApi } = useDetailApi();
    await callApi();
    expect(error.value).toBe('Select a project first.');
  });

  it('usePathOnly sets paramsText when project selected', async () => {
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';
    store.selectedProject = { path: '/test', type: 'npm' };

    const { paramsText, usePathOnly } = useDetailApi();
    usePathOnly();
    expect(paramsText.value).toContain('/test');
  });

  it('usePathAndType sets paramsText with path and type', async () => {
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';
    store.projects = [{ path: '/test', type: 'php' }];

    const { paramsText, usePathAndType } = useDetailApi();
    usePathAndType();
    expect(paramsText.value).toContain('/test');
    expect(paramsText.value).toContain('php');
  });

  it('callApi sets error for invalid JSON params', async () => {
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';
    store.projects = [{ path: '/test' }];

    const { paramsText, error, callApi } = useDetailApi();
    paramsText.value = 'not json';
    await callApi();
    expect(error.value).toBeTruthy();
    expect(error.value.length).toBeGreaterThan(0);
  });

  it('callApi sets error when params is not array', async () => {
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';
    store.selectedProject = { path: '/test' };

    const { paramsText, error, callApi } = useDetailApi();
    paramsText.value = '{}';
    await callApi();
    expect(error.value).toContain('Params must be a JSON array');
  });

  it('callApi calls invokeApi and sets rawResponse', async () => {
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';
    store.selectedProject = { path: '/test' };

    const api = globalThis.window?.releaseManager;
    api.invokeApi.mockResolvedValue({ ok: true, result: { name: 'test' } });

    const { paramsText, rawResponse, callApi } = useDetailApi();
    await callApi();
    expect(api.invokeApi).toHaveBeenCalled();
    expect(rawResponse.value).toEqual({ ok: true, result: { name: 'test' } });
  });

  it('formattedResponse formats rawResponse as JSON', async () => {
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';
    store.selectedProject = { path: '/test' };

    const api = globalThis.window?.releaseManager;
    api.invokeApi.mockResolvedValue({ data: { x: 1 } });

    const { formattedResponse, callApi } = useDetailApi();
    await callApi();
    expect(formattedResponse.value).toContain('"data"');
    expect(formattedResponse.value).toContain('"x"');
  });

  it('mcpSnippet includes method and params', async () => {
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';
    store.selectedProject = { path: '/test' };

    const { paramsText, mcpSnippet } = useDetailApi();
    paramsText.value = '["/test"]';
    expect(mcpSnippet.value).toContain('release_manager_call');
    expect(mcpSnippet.value).toContain('getProjectInfo');
  });

  it('callApi with invokeApi method passes inner method and params', async () => {
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';
    store.selectedProject = { path: '/test' };

    const api = globalThis.window?.releaseManager;
    api.invokeApi.mockResolvedValue({ ok: true });
    const { methodName, paramsText, callApi } = useDetailApi();
    methodName.value = 'invokeApi';
    paramsText.value = '["getBranches", ["/path"]]';
    await callApi();
    expect(api.invokeApi).toHaveBeenCalledWith('getBranches', ['/path']);
  });

  it('callApi sets error on catch', async () => {
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';
    store.selectedProject = { path: '/test' };

    const api = globalThis.window?.releaseManager;
    api.invokeApi.mockRejectedValue(new Error('Network error'));
    const { error, callApi } = useDetailApi();
    await callApi();
    expect(error.value).toBe('Network error');
  });

  it('usePathOnly does nothing when no project', async () => {
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    store.selectedPath = '';
    store.selectedProject = null;
    const { paramsText, usePathOnly } = useDetailApi();
    const before = paramsText.value;
    usePathOnly();
    expect(paramsText.value).toBe(before);
  });
});
