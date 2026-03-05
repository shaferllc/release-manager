import { ref, computed, onMounted, watch } from 'vue';
import { useApi } from './useApi';

/**
 * Composable for API view: server toggle/port, MCP server, API tester, method docs.
 * No arguments. Returns all state and methods for ApiView.vue.
 */
export function useApiView() {
  const api = useApi();

  const status = ref({ running: false, port: 3847, enabled: false });
  const enabled = ref(false);
  const port = ref(3847);
  const docs = ref([]);
  const selectedCategory = ref('');
  const methodFilter = ref('');
  const selectedMethod = ref(null);
  const copyStatus = ref('');
  const sampleLoading = ref(false);
  const sampleResult = ref(null);
  const builderParamValues = ref({});
  const sending = ref(false);
  const lastResponse = ref(null);
  const mcpStatus = ref({ running: false, pid: undefined });
  const mcpBusy = ref(false);
  const mcpError = ref('');
  const appPath = ref('');

  const baseUrl = computed(() => {
    if (!status.value.running || !status.value.port) return '';
    return `http://127.0.0.1:${status.value.port}/api`;
  });

  const categoryOptions = computed(() => {
    const cats = new Set();
    docs.value.forEach((d) => {
      if (d.category) cats.add(d.category);
    });
    return Array.from(cats).sort();
  });

  const filteredDocs = computed(() => {
    let list = docs.value;
    const category = selectedCategory.value;
    if (category) list = list.filter((d) => d.category === category);
    const q = (methodFilter.value || '').trim().toLowerCase();
    if (!q) return list;
    return list.filter((d) => d.name.toLowerCase().includes(q) || (d.description && d.description.toLowerCase().includes(q)) || (d.category && d.category.toLowerCase().includes(q)));
  });

  const methodOptions = computed(() => [
    { value: '', label: '— Select method —' },
    ...filteredDocs.value.map((d) => ({ value: d.name, label: d.name })),
  ]);

  const selectedCategoryOptions = computed(() => [
    { value: '', label: 'All categories' },
    ...categoryOptions.value.map((c) => ({ value: c, label: c })),
  ]);

  const selectedDoc = computed(() => {
    const name = selectedMethod.value;
    if (!name) return null;
    return docs.value.find((d) => d.name === name) || null;
  });

  function getDefaultParamValueString(p) {
    const name = (p && p.name) || '';
    const type = (p && p.type) || '';
    if (name === 'dirPath' || name === 'targetPath') return '/path/to/project';
    if (name === 'filePath' || name === 'relativePath') return '/path/to/file';
    if (name === 'branchName' || name === 'newBranchName' || name === 'oldName' || name === 'newName') return 'main';
    if (name === 'tagName' || name === 'sinceTag' || name === 'ref' || name === 'fromRef') return 'v1.0.0';
    if (name === 'sha') return 'abc1234';
    if (name === 'gitRemote') return 'https://github.com/owner/repo';
    if (name === 'url') return 'https://example.com';
    if (name === 'methodName') return 'getProjects';
    if (type === 'number') return '0';
    if (type === 'boolean') return 'false';
    if (type === 'Array' || name === 'packageNames' || name === 'projects' || name === 'commits') return '[]';
    if (type === 'object' || name === 'options') return '{}';
    return '';
  }

  function isJsonParam(p) {
    const t = (p && p.type) || '';
    const n = (p && p.name) || '';
    return t === 'Array' || t === 'object' || ['projects', 'packageNames', 'options', 'commits'].includes(n);
  }

  function jsonPlaceholder(p) {
    const t = (p && p.type) || '';
    const n = (p && p.name) || '';
    if (t === 'object' || n === 'options') return '{}';
    return '[]';
  }

  function defaultPlaceholder(p) {
    return getDefaultParamValueString(p);
  }

  function buildParamsArray() {
    const doc = selectedDoc.value;
    if (!doc || !doc.params || !doc.params.length) return [];
    return doc.params.map((p) => {
      const raw = builderParamValues.value[p.name];
      const type = (p.type || '').toLowerCase();
      if (type === 'number') return raw === '' ? 0 : Number(raw);
      if (type === 'boolean') return raw === 'true';
      if (isJsonParam(p)) {
        try {
          return raw?.trim() ? JSON.parse(raw) : (type === 'object' || p.name === 'options' ? {} : []);
        } catch {
          return type === 'object' || p.name === 'options' ? {} : [];
        }
      }
      return raw == null ? '' : String(raw);
    });
  }

  const requestBodyPreview = computed(() => {
    const method = selectedMethod.value;
    if (!method) return '';
    const params = buildParamsArray();
    return JSON.stringify({ method, params }, null, 2);
  });

  const responseStatusLabel = computed(() => {
    const r = lastResponse.value;
    if (!r) return '';
    if (r.status === 0) return 'Connection failed';
    return `${r.status} ${r.ok ? 'OK' : 'Error'}`;
  });

  const responseBodyDisplay = computed(() => {
    const r = lastResponse.value;
    if (!r || r.body == null) return '';
    const body = r.body;
    if (typeof body !== 'string') {
      try {
        return JSON.stringify(body, null, 2);
      } catch {
        return String(body);
      }
    }
    return body.replace(/\\n/g, '\n');
  });

  const exampleCurl = computed(() => {
    const url = baseUrl.value || 'http://127.0.0.1:3847/api';
    return `curl -X POST ${url} \\
  -H "Content-Type: application/json" \\
  -d '{"method":"getProjects","params":[]}'`;
  });

  async function loadMcpStatus() {
    try {
      const s = await api.getMcpServerStatus?.();
      if (s) mcpStatus.value = { running: !!s.running, pid: s.pid };
    } catch (_) {}
  }

  async function loadAppPath() {
    try {
      const p = await api.getAppPath?.();
      appPath.value = p || '';
    } catch (_) {}
  }

  async function startMcp() {
    mcpError.value = '';
    mcpBusy.value = true;
    try {
      const r = await api.startMcpServer?.();
      if (r?.ok) await loadMcpStatus();
      else mcpError.value = r?.error || 'Failed to start';
    } catch (e) {
      mcpError.value = e?.message || 'Failed to start';
    } finally {
      mcpBusy.value = false;
    }
  }

  async function stopMcp() {
    mcpError.value = '';
    mcpBusy.value = true;
    try {
      await api.stopMcpServer?.();
      await loadMcpStatus();
    } catch (e) {
      mcpError.value = e?.message || 'Failed to stop';
    } finally {
      mcpBusy.value = false;
    }
  }

  function openTerminalForMcp() {
    const p = appPath.value;
    if (p && api.openInTerminal) api.openInTerminal(p);
  }

  async function loadStatus() {
    try {
      const s = await api.getApiServerStatus?.();
      if (s) {
        status.value = s;
        enabled.value = !!s.enabled;
        port.value = s.port || 3847;
      }
    } catch (_) {}
  }

  async function loadDocs() {
    try {
      const list = await api.getApiDocs?.();
      docs.value = Array.isArray(list) ? list : [];
    } catch (_) {
      docs.value = [];
    }
  }

  function onToggleEnabled() {
    api.setApiServerEnabled?.(enabled.value).then(() => loadStatus());
  }

  function onPortBlur() {
    const p = Number(port.value);
    if (!Number.isFinite(p) || p < 1 || p > 65535) return;
    api.setApiServerPort?.(p).then(() => loadStatus());
  }

  function syncBuilderParams() {
    const doc = selectedDoc.value;
    const next = {};
    if (doc && doc.params) {
      doc.params.forEach((p, i) => {
        const def = getDefaultParamValueString(p);
        next[p.name] = builderParamValues.value[p.name] !== undefined && builderParamValues.value[p.name] !== '' ? builderParamValues.value[p.name] : def;
      });
    }
    builderParamValues.value = next;
  }

  function selectMethod(m) {
    selectedMethod.value = m;
    sampleResult.value = null;
    syncBuilderParams();
  }

  async function sendRequest() {
    const method = selectedMethod.value;
    if (!method) return;
    const params = buildParamsArray();
    sending.value = true;
    lastResponse.value = null;
    const start = performance.now();

    if (typeof api.invokeApi === 'function') {
      try {
        const result = await api.invokeApi(method, params);
        const duration = Math.round(performance.now() - start);
        lastResponse.value = {
          status: 200,
          ok: true,
          duration,
          via: 'Via app',
          body: JSON.stringify({ ok: true, result }, null, 2),
        };
      } catch (e) {
        const message = e && (e.message || (e.toString && e.toString())) || 'Unknown error';
        lastResponse.value = {
          status: 200,
          ok: false,
          duration: Math.round(performance.now() - start),
          via: 'Via app',
          body: JSON.stringify({ ok: false, error: message }, null, 2),
        };
      } finally {
        sending.value = false;
      }
      return;
    }

    const url = baseUrl.value;
    if (!url) {
      lastResponse.value = { status: 0, ok: false, body: 'Enable the API server above to test over HTTP.', via: null };
      sending.value = false;
      return;
    }
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, params }),
      });
      const duration = Math.round(performance.now() - start);
      let bodyText;
      try {
        const data = await res.json();
        bodyText = JSON.stringify(data, null, 2);
      } catch {
        bodyText = await res.text();
      }
      lastResponse.value = { status: res.status, ok: res.ok, duration, via: 'Via HTTP', body: bodyText };
    } catch (e) {
      lastResponse.value = {
        status: 0,
        ok: false,
        body: (e && (e.message || String(e))) || 'Request failed. Check that the API server is enabled and running.',
        via: null,
      };
    } finally {
      sending.value = false;
    }
  }

  function fillSampleParams() {
    syncBuilderParams();
  }

  function copyToClipboard(text, label) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        copyStatus.value = `${label} copied`;
        setTimeout(() => { copyStatus.value = ''; }, 2000);
      });
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      copyStatus.value = `${label} copied`;
      setTimeout(() => { copyStatus.value = ''; }, 2000);
    }
  }

  function copyResponse() {
    if (lastResponse.value && lastResponse.value.body) copyToClipboard(lastResponse.value.body, 'Response');
  }

  async function trySample(methodName) {
    const url = baseUrl.value;
    if (!url) return;
    sampleLoading.value = true;
    sampleResult.value = null;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'getSampleResponse', params: [methodName] }),
      });
      const data = await res.json();
      sampleResult.value = JSON.stringify(data, null, 2);
    } catch (e) {
      sampleResult.value = e && (e.message || String(e)) || 'Request failed';
    } finally {
      sampleLoading.value = false;
    }
  }

  function exampleParamsForMethod(m) {
    const doc = docs.value.find((d) => d.name === m);
    if (doc && doc.params && doc.params.length > 0) {
      const placeholders = doc.params.map((p) => {
        if (p.name === 'dirPath' || p.name === 'targetPath') return '"/path/to/project"';
        if (p.name === 'filePath' || p.name === 'relativePath') return '"/path/to/file"';
        if (p.name === 'branchName' || p.name === 'newBranchName' || p.name === 'oldName' || p.name === 'newName') return '"main"';
        if (p.name === 'tagName' || p.name === 'sinceTag' || p.name === 'ref' || p.name === 'fromRef') return '"v1.0.0"';
        if (p.name === 'sha') return '"abc1234"';
        if (p.name === 'gitRemote') return '"https://github.com/owner/repo"';
        if (p.name === 'url') return '"https://example.com"';
        if (p.type === 'number') return '0';
        if (p.type === 'boolean') return 'false';
        if (p.type === 'Array' || p.name === 'packageNames' || p.name === 'projects') return '[]';
        return '""';
      });
      return JSON.stringify(placeholders);
    }
    return '[]';
  }

  function exampleForMethod(m) {
    const url = baseUrl.value || 'http://127.0.0.1:3847/api';
    const params = exampleParamsForMethod(m);
    return `curl -X POST ${url} -H "Content-Type: application/json" -d '{"method":"${m}","params":${params}}'`;
  }

  function copyBaseUrl() {
    if (!baseUrl.value) return;
    copyToClipboard(baseUrl.value, 'URL');
  }

  function copyExample(m) {
    copyToClipboard(exampleForMethod(m), 'example');
  }

  function copySampleResponse(json) {
    copyToClipboard(json, 'JSON');
  }

  onMounted(() => {
    loadStatus();
    loadDocs();
    loadMcpStatus();
    loadAppPath();
  });

  watch(enabled, () => loadStatus());
  watch(port, () => loadStatus());
  watch(selectedMethod, () => syncBuilderParams());

  return {
    status,
    enabled,
    port,
    baseUrl,
    copyStatus,
    onToggleEnabled,
    onPortBlur,
    copyBaseUrl,
    mcpStatus,
    mcpBusy,
    mcpError,
    appPath,
    startMcp,
    stopMcp,
    openTerminalForMcp,
    selectedMethod,
    methodOptions,
    selectedDoc,
    builderParamValues,
    requestBodyPreview,
    sending,
    sendRequest,
    fillSampleParams,
    lastResponse,
    responseStatusLabel,
    responseBodyDisplay,
    copyResponse,
    isJsonParam,
    jsonPlaceholder,
    defaultPlaceholder,
    docs,
    selectedCategory,
    methodFilter,
    filteredDocs,
    selectedCategoryOptions,
    selectMethod,
    exampleForMethod,
    copyExample,
    copySampleResponse,
    trySample,
    sampleLoading,
    sampleResult,
  };
}
