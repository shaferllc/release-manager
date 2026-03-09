import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { useApiView } from './useApiView';

describe('useApiView', () => {
  const originalReleaseManager = globalThis.window?.releaseManager;
  const originalFetch = globalThis.fetch;
  const originalClipboard = navigator.clipboard;

  beforeEach(() => {
    setActivePinia(createPinia());
    if (globalThis.window) {
      globalThis.window.releaseManager = {
        getApiServerStatus: vi.fn().mockResolvedValue({ running: true, port: 3847, enabled: true }),
        getApiDocs: vi.fn().mockResolvedValue([
          { name: 'getProjects', category: 'Projects', params: [] },
          { name: 'getBranches', category: 'Git', params: [{ name: 'dirPath', type: 'string' }] },
        ]),
        getMcpServerStatus: vi
          .fn()
          .mockResolvedValueOnce({ running: false })
          .mockResolvedValueOnce({ running: true })
          .mockResolvedValue({ running: false }),
        getAppPath: vi.fn().mockResolvedValue('/app/path'),
        startMcpServer: vi.fn().mockResolvedValue({ ok: true }),
        stopMcpServer: vi.fn().mockResolvedValue(undefined),
        setApiServerEnabled: vi.fn().mockResolvedValue(undefined),
        setApiServerPort: vi.fn().mockResolvedValue(undefined),
        invokeApi: vi.fn().mockResolvedValue({ ok: true, result: [] }),
      };
    }
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    Object.defineProperty(navigator, 'clipboard', { value: originalClipboard, configurable: true });
    if (globalThis.window) {
      globalThis.window.releaseManager = originalReleaseManager;
    }
  });

  function mountComposable() {
    const TestComp = defineComponent({
      setup() {
        return useApiView();
      },
      template: '<div />',
    });
    return mount(TestComp, { global: { plugins: [createPinia()] } });
  }

  it('returns status, baseUrl, docs, methodOptions, etc.', async () => {
    const wrapper = mountComposable();
    await new Promise((r) => setTimeout(r, 50));
    const vm = wrapper.vm;
    expect(vm.status).toBeDefined();
    expect(vm.baseUrl).toBeDefined();
    expect(vm.docs).toBeDefined();
    expect(vm.methodOptions).toBeDefined();
    expect(vm.selectMethod).toBeDefined();
    expect(vm.sendRequest).toBeDefined();
  });

  it('baseUrl is set when server running', async () => {
    const wrapper = mountComposable();
    await new Promise((r) => setTimeout(r, 50));
    expect(wrapper.vm.baseUrl).toBe('http://127.0.0.1:3847/api');
  });

  it('baseUrl is empty when server not running', async () => {
    globalThis.window.releaseManager.getApiServerStatus.mockResolvedValue({
      running: false,
      port: 3847,
      enabled: false,
    });
    const wrapper = mountComposable();
    await new Promise((r) => setTimeout(r, 50));
    expect(wrapper.vm.baseUrl).toBe('');
  });

  it('selectedCategoryOptions includes categories from docs', async () => {
    const wrapper = mountComposable();
    await new Promise((r) => setTimeout(r, 50));
    const opts = wrapper.vm.selectedCategoryOptions;
    expect(Array.isArray(opts)).toBe(true);
    const labels = opts.map((o) => o.label);
    expect(labels).toContain('Projects');
    expect(labels).toContain('Git');
  });

  it('filteredDocs filters by methodFilter', async () => {
    const wrapper = mountComposable();
    await new Promise((r) => setTimeout(r, 50));
    wrapper.vm.methodFilter = 'getProjects';
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.filteredDocs.length).toBe(1);
    expect(wrapper.vm.filteredDocs[0].name).toBe('getProjects');
  });

  it('selectMethod sets selectedMethod and syncs builder params', async () => {
    const wrapper = mountComposable();
    await new Promise((r) => setTimeout(r, 50));
    wrapper.vm.selectMethod('getBranches');
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.selectedMethod).toBe('getBranches');
    expect(wrapper.vm.builderParamValues.dirPath).toBe('/path/to/project');
  });

  it('sendRequest uses invokeApi when available', async () => {
    const wrapper = mountComposable();
    await new Promise((r) => setTimeout(r, 50));
    wrapper.vm.selectMethod('getProjects');
    await wrapper.vm.$nextTick();
    await wrapper.vm.sendRequest();
    expect(globalThis.window.releaseManager.invokeApi).toHaveBeenCalledWith('getProjects', []);
    expect(wrapper.vm.lastResponse?.ok).toBe(true);
  });

  it('onToggleEnabled calls setApiServerEnabled', async () => {
    globalThis.window.releaseManager.getApiServerStatus.mockResolvedValue({
      running: true,
      port: 3847,
      enabled: false,
    });
    const wrapper = mountComposable();
    await new Promise((r) => setTimeout(r, 50));
    expect(wrapper.vm.enabled).toBe(false);
    wrapper.vm.onToggleEnabled();
    await new Promise((r) => setTimeout(r, 50));
    expect(globalThis.window.releaseManager.setApiServerEnabled).toHaveBeenCalledWith(false);
  });

  it('onPortBlur validates port range', async () => {
    const wrapper = mountComposable();
    await new Promise((r) => setTimeout(r, 50));
    wrapper.vm.port = 99999;
    wrapper.vm.onPortBlur();
    expect(globalThis.window.releaseManager.setApiServerPort).not.toHaveBeenCalled();
    wrapper.vm.port = 4000;
    wrapper.vm.onPortBlur();
    expect(globalThis.window.releaseManager.setApiServerPort).toHaveBeenCalledWith(4000);
  });

  it('startMcp calls startMcpServer and loads status', async () => {
    const wrapper = mountComposable();
    await new Promise((r) => setTimeout(r, 50));
    await wrapper.vm.startMcp();
    expect(globalThis.window.releaseManager.startMcpServer).toHaveBeenCalled();
    expect(wrapper.vm.mcpStatus.running).toBe(true);
  });

  it('stopMcp calls stopMcpServer', async () => {
    const wrapper = mountComposable();
    await new Promise((r) => setTimeout(r, 50));
    await wrapper.vm.stopMcp();
    expect(globalThis.window.releaseManager.stopMcpServer).toHaveBeenCalled();
  });

  it('isJsonParam returns true for Array type', async () => {
    const wrapper = mountComposable();
    expect(wrapper.vm.isJsonParam({ type: 'Array' })).toBe(true);
  });

  it('defaultPlaceholder returns dirPath placeholder', async () => {
    const wrapper = mountComposable();
    expect(wrapper.vm.defaultPlaceholder({ name: 'dirPath' })).toBe('/path/to/project');
  });

  it('sendRequest handles invokeApi error', async () => {
    globalThis.window.releaseManager.invokeApi.mockRejectedValue(new Error('API error'));
    const wrapper = mountComposable();
    await new Promise((r) => setTimeout(r, 50));
    wrapper.vm.selectMethod('getProjects');
    await wrapper.vm.$nextTick();
    await wrapper.vm.sendRequest();
    expect(wrapper.vm.lastResponse?.ok).toBe(false);
    expect(wrapper.vm.lastResponse?.body).toContain('API error');
  });

  it('stopMcp handles error', async () => {
    globalThis.window.releaseManager.stopMcpServer.mockRejectedValue(new Error('stop failed'));
    const wrapper = mountComposable();
    await new Promise((r) => setTimeout(r, 50));
    await wrapper.vm.stopMcp();
    expect(wrapper.vm.mcpError).toBe('stop failed');
  });

  it('responseStatusLabel returns Connection failed for status 0', async () => {
    const wrapper = mountComposable();
    await new Promise((r) => setTimeout(r, 50));
    wrapper.vm.lastResponse = { status: 0 };
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.responseStatusLabel).toBe('Connection failed');
  });

  it('responseBodyDisplay stringifies non-string body', async () => {
    const wrapper = mountComposable();
    await new Promise((r) => setTimeout(r, 50));
    wrapper.vm.lastResponse = { body: { foo: 1 } };
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.responseBodyDisplay).toContain('"foo"');
  });

  it('copyResponse copies lastResponse body', async () => {
    const wrapper = mountComposable();
    await new Promise((r) => setTimeout(r, 50));
    wrapper.vm.lastResponse = { body: '{"ok":true}' };
    await wrapper.vm.$nextTick();
    wrapper.vm.copyResponse();
    await new Promise((r) => setTimeout(r, 100));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('{"ok":true}');
  });

  it('trySample fetches sample and sets sampleResult', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: 'sample' }),
    });
    const wrapper = mountComposable();
    await new Promise((r) => setTimeout(r, 50));
    await wrapper.vm.trySample('getProjects');
    expect(wrapper.vm.sampleResult).toBeDefined();
  });

  it('trySample sets error on fetch failure', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const wrapper = mountComposable();
    await new Promise((r) => setTimeout(r, 50));
    await wrapper.vm.trySample('getProjects');
    expect(wrapper.vm.sampleResult).toContain('Network error');
  });

  it('exampleForMethod returns curl string', async () => {
    const wrapper = mountComposable();
    await new Promise((r) => setTimeout(r, 50));
    const ex = wrapper.vm.exampleForMethod('getBranches');
    expect(ex).toContain('curl');
    expect(ex).toContain('getBranches');
  });

  it('jsonPlaceholder returns [] for Array type', async () => {
    const wrapper = mountComposable();
    expect(wrapper.vm.jsonPlaceholder({ type: 'Array' })).toBe('[]');
  });

  it('sendRequest uses fetch when invokeApi not available', async () => {
    delete globalThis.window.releaseManager.invokeApi;
    globalThis.window.releaseManager.getApiServerStatus.mockResolvedValue({
      running: true,
      port: 3847,
      enabled: true,
    });
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ok: true, result: [] }),
    });
    const wrapper = mountComposable();
    await new Promise((r) => setTimeout(r, 50));
    wrapper.vm.selectMethod('getProjects');
    await wrapper.vm.$nextTick();
    await wrapper.vm.sendRequest();
    expect(globalThis.fetch).toHaveBeenCalled();
    expect(wrapper.vm.lastResponse?.ok).toBe(true);
    expect(wrapper.vm.lastResponse?.via).toBe('Via HTTP');
  });

  it('sendRequest sets connection failed when baseUrl empty and no invokeApi', async () => {
    delete globalThis.window.releaseManager.invokeApi;
    globalThis.window.releaseManager.getApiServerStatus.mockResolvedValue({
      running: false,
      port: 3847,
      enabled: false,
    });
    const wrapper = mountComposable();
    await new Promise((r) => setTimeout(r, 50));
    wrapper.vm.selectMethod('getProjects');
    await wrapper.vm.$nextTick();
    await wrapper.vm.sendRequest();
    expect(wrapper.vm.lastResponse?.status).toBe(0);
    expect(wrapper.vm.lastResponse?.body).toContain('Enable the API server');
  });
});
